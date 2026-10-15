const express = require('express');
const router = express.Router();
const { db } = require('../db/connection');
const { authenticateToken } = require('../middleware/auth');

// GET /api/dashboard
router.get('/', authenticateToken, (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';

    // 1. Stok Metrikleri (Stokta olan ürünler)
    const stockStats = db.prepare(`
      SELECT 
        COUNT(*) as total_items,
        COALESCE(SUM(purchase_price_cents), 0) as total_cost,
        COALESCE(SUM(estimated_sale_price_cents), 0) as total_estimated_value
      FROM products
      WHERE status = 'in_stock' AND is_deleted = 0
    `).get();

    // 2. Bu Ayki Metrikler (Tarih bazlı)
    // Format: YYYY-MM
    const currentMonth = new Date().toISOString().substring(0, 7);

    // Bu ay yapılan alışlar
    const monthlyPurchases = db.prepare(`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(total_amount_cents), 0) as total_amount,
        COALESCE(SUM(paid_amount_cents), 0) as total_paid
      FROM purchases
      WHERE strftime('%Y-%m', purchase_date) = ? AND is_deleted = 0
    `).get(currentMonth);

    // Bu ay yapılan satışlar & brüt kâr
    const monthlySales = db.prepare(`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(total_amount_cents), 0) as total_amount,
        COALESCE(SUM(cost_amount_cents), 0) as total_cost,
        COALESCE(SUM(gross_profit_cents), 0) as gross_profit,
        COALESCE(SUM(collected_amount_cents), 0) as total_collected
      FROM sales
      WHERE strftime('%Y-%m', sale_date) = ? AND is_deleted = 0
    `).get(currentMonth);

    // Bu ay yapılan masraflar
    const monthlyExpenses = db.prepare(`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(amount_cents), 0) as total_amount
      FROM expenses
      WHERE strftime('%Y-%m', date) = ? AND is_deleted = 0
    `).get(currentMonth);

    // Net Kâr = Brüt Kâr - Masraflar
    const netProfit = (monthlySales ? Number(monthlySales.gross_profit) : 0) - (monthlyExpenses ? Number(monthlyExpenses.total_amount) : 0);

    // 3. Toplam Alacak ve Toplam Borç (Cariler tablosundan)
    // Pozitif bakiye = Bizim alacağımız var (Müşteri borçlu)
    // Negatif bakiye = Bizim borcumuz var (Tedarikçiye borçluyuz)
    const cariBalances = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN balance_cents > 0 THEN balance_cents ELSE 0 END), 0) as total_receivables,
        COALESCE(SUM(CASE WHEN balance_cents < 0 THEN ABS(balance_cents) ELSE 0 END), 0) as total_payables
      FROM cariler
      WHERE is_deleted = 0
    `).get();

    // 4. Kategori Bazında Stok Dağılımı
    const categoryDistribution = db.prepare(`
      SELECT 
        c.id,
        c.name,
        c.icon,
        COUNT(p.id) as item_count,
        COALESCE(SUM(p.purchase_price_cents), 0) as total_cost,
        COALESCE(SUM(p.estimated_sale_price_cents), 0) as total_retail_value
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.status = 'in_stock' AND p.is_deleted = 0
      GROUP BY c.id
      ORDER BY item_count DESC, total_cost DESC
    `).all();

    // 5. Kritik / Uzun Süredir Satılmayan Ürünler (Stokta 30+ gündür bekleyenler)
    const slowMovingItems = db.prepare(`
      SELECT 
        p.id,
        p.product_code,
        p.name,
        p.brand,
        p.model,
        p.serial_number,
        p.imei,
        p.purchase_price_cents,
        p.estimated_sale_price_cents,
        p.purchase_date,
        c.name as category_name,
        ROUND(julianday('now', 'localtime') - julianday(p.purchase_date)) as days_in_stock
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'in_stock' AND p.is_deleted = 0
        AND julianday('now', 'localtime') - julianday(p.purchase_date) >= 30
      ORDER BY days_in_stock DESC
      LIMIT 10
    `).all();

    // 6. Son Yapılan Alışlar (Son 5)
    const recentPurchases = db.prepare(`
      SELECT 
        p.id,
        p.invoice_no,
        p.purchase_date,
        p.total_amount_cents,
        p.paid_amount_cents,
        p.payment_method,
        c.name as cari_name
      FROM purchases p
      JOIN cariler c ON p.cari_id = c.id
      WHERE p.is_deleted = 0
      ORDER BY p.purchase_date DESC, p.id DESC
      LIMIT 5
    `).all();

    // 7. Son Yapılan Satışlar (Son 5)
    const recentSales = db.prepare(`
      SELECT 
        s.id,
        s.invoice_no,
        s.sale_date,
        s.total_amount_cents,
        s.gross_profit_cents,
        s.collected_amount_cents,
        s.payment_method,
        c.name as cari_name
      FROM sales s
      JOIN cariler c ON s.cari_id = c.id
      WHERE s.is_deleted = 0
      ORDER BY s.sale_date DESC, s.id DESC
      LIMIT 5
    `).all();

    // 8. Son Hareketler (Satış, Alış, Ödeme, Tahsilat birleşik zaman akışı)
    const recentActivities = db.prepare(`
      SELECT * FROM (
        SELECT 
          'sale' as type,
          s.invoice_no as doc_no,
          s.sale_date as date,
          s.total_amount_cents as amount_cents,
          c.name as cari_name,
          s.created_at
        FROM sales s
        JOIN cariler c ON s.cari_id = c.id
        WHERE s.is_deleted = 0

        UNION ALL

        SELECT 
          'purchase' as type,
          p.invoice_no as doc_no,
          p.purchase_date as date,
          p.total_amount_cents as amount_cents,
          c.name as cari_name,
          p.created_at
        FROM purchases p
        JOIN cariler c ON p.cari_id = c.id
        WHERE p.is_deleted = 0

        UNION ALL

        SELECT 
          pay.type as type,
          pay.receipt_no as doc_no,
          pay.date as date,
          pay.amount_cents as amount_cents,
          c.name as cari_name,
          pay.created_at
        FROM payments pay
        JOIN cariler c ON pay.cari_id = c.id
        WHERE pay.is_deleted = 0
      )
      ORDER BY created_at DESC
      LIMIT 10
    `).all();

    res.json({
      success: true,
      isAdmin,
      metrics: {
        totalStockCount: Number(stockStats?.total_items || 0),
        totalStockCost: isAdmin ? Number(stockStats?.total_cost || 0) : null,
        totalStockEstimatedValue: Number(stockStats?.total_estimated_value || 0),
        potentialStockProfit: isAdmin ? (Number(stockStats?.total_estimated_value || 0) - Number(stockStats?.total_cost || 0)) : null,
        monthlyPurchasesTotal: Number(monthlyPurchases?.total_amount || 0),
        monthlyPurchasesCount: Number(monthlyPurchases?.count || 0),
        monthlySalesTotal: Number(monthlySales?.total_amount || 0),
        monthlySalesCount: Number(monthlySales?.count || 0),
        monthlyGrossProfit: isAdmin ? Number(monthlySales?.gross_profit || 0) : null,
        monthlyExpensesTotal: Number(monthlyExpenses?.total_amount || 0),
        monthlyNetProfit: isAdmin ? netProfit : null,
        totalReceivables: Number(cariBalances?.total_receivables || 0),
        totalPayables: Number(cariBalances?.total_payables || 0)
      },
      categoryDistribution: categoryDistribution.map(cat => ({
        ...cat,
        total_cost: isAdmin ? cat.total_cost : null
      })),
      slowMovingItems: slowMovingItems.map(item => ({
        ...item,
        purchase_price_cents: isAdmin ? item.purchase_price_cents : null
      })),
      recentPurchases,
      recentSales: recentSales.map(sale => ({
        ...sale,
        gross_profit_cents: isAdmin ? sale.gross_profit_cents : null
      })),
      recentActivities
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ success: false, message: 'Dashboard verileri alınırken hata oluştu: ' + err.message });
  }
});

module.exports = router;
