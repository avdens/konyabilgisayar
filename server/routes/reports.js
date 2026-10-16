const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const { db } = require('../db/connection');
const { authenticateToken } = require('../middleware/auth');

// GET /api/reports/comprehensive - Comprehensive reports data for date range
router.get('/comprehensive', authenticateToken, async (req, res) => {
  try {
    const { date_start, date_end } = req.query;
    const isAdmin = req.user.role === 'admin';

    let dateFilterSales = 's.is_deleted = 0';
    let dateFilterPurchases = 'p.is_deleted = 0';
    let dateFilterExpenses = 'e.is_deleted = 0';
    let paramsSales = [];
    let paramsPurchases = [];
    let paramsExpenses = [];

    if (date_start) {
      dateFilterSales += ' AND s.sale_date >= ?';
      paramsSales.push(date_start);
      dateFilterPurchases += ' AND p.purchase_date >= ?';
      paramsPurchases.push(date_start);
      dateFilterExpenses += ' AND e.date >= ?';
      paramsExpenses.push(date_start);
    }

    if (date_end) {
      dateFilterSales += ' AND s.sale_date <= ?';
      paramsSales.push(date_end);
      dateFilterPurchases += ' AND p.purchase_date <= ?';
      paramsPurchases.push(date_end);
      dateFilterExpenses += ' AND e.date <= ?';
      paramsExpenses.push(date_end);
    }

    // 1. Satış Özeti
    const salesSummary = await db.prepare(`
      SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(total_amount_cents), 0) as total_revenue,
        COALESCE(SUM(cost_amount_cents), 0) as total_cost,
        COALESCE(SUM(gross_profit_cents), 0) as total_gross_profit,
        COALESCE(SUM(collected_amount_cents), 0) as total_collected,
        COALESCE(SUM(remaining_amount_cents), 0) as total_receivable_from_sales
      FROM sales s
      WHERE ${dateFilterSales}
    `).get(...paramsSales);

    // 2. Alış Özeti
    const purchasesSummary = await db.prepare(`
      SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(total_amount_cents), 0) as total_purchases,
        COALESCE(SUM(paid_amount_cents), 0) as total_paid,
        COALESCE(SUM(remaining_amount_cents), 0) as total_debt_from_purchases
      FROM purchases p
      WHERE ${dateFilterPurchases}
    `).get(...paramsPurchases);

    // 3. Masraf Özeti
    const expensesSummary = await db.prepare(`
      SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(amount_cents), 0) as total_expenses
      FROM expenses e
      WHERE ${dateFilterExpenses}
    `).get(...paramsExpenses);

    // Masraf Kategorileri Dağılımı
    const expensesByCategory = await db.prepare(`
      SELECT 
        e.category,
        COUNT(*) as count,
        COALESCE(SUM(e.amount_cents), 0) as total_amount
      FROM expenses e
      WHERE ${dateFilterExpenses}
      GROUP BY e.category
      ORDER BY total_amount DESC
    `).all(...paramsExpenses);

    // 4. Net Kâr = Brüt Kâr - Masraflar
    const grossProfit = salesSummary ? Number(salesSummary.total_gross_profit) : 0;
    const totalExpenses = expensesSummary ? Number(expensesSummary.total_expenses) : 0;
    const netProfit = grossProfit - totalExpenses;

    // 5. Güncel Stok Durumu & Maliyeti
    const stockReport = await db.prepare(`
      SELECT 
        c.name as category_name,
        COUNT(p.id) as in_stock_count,
        COALESCE(SUM(p.purchase_price_cents), 0) as total_cost,
        COALESCE(SUM(p.estimated_sale_price_cents), 0) as total_estimated_value
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.status = 'in_stock' AND p.is_deleted = 0
      GROUP BY c.id, c.name
      HAVING COUNT(p.id) > 0
      ORDER BY total_cost DESC
    `).all();

    // 6. Güncel Borç & Alacak Durumu
    const debtReceivableReport = await db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN balance_cents > 0 THEN balance_cents ELSE 0 END), 0) as total_receivables,
        COALESCE(SUM(CASE WHEN balance_cents < 0 THEN ABS(balance_cents) ELSE 0 END), 0) as total_payables,
        COUNT(CASE WHEN balance_cents > 0 THEN 1 END) as debtor_customers_count,
        COUNT(CASE WHEN balance_cents < 0 THEN 1 END) as creditor_suppliers_count
      FROM cariler
      WHERE is_deleted = 0
    `).get();

    // 7. En Çok Satan Kategoriler
    const topCategories = await db.prepare(`
      SELECT 
        c.name as category_name,
        COUNT(si.id) as sold_count,
        COALESCE(SUM(si.sale_price_cents), 0) as total_sales,
        COALESCE(SUM(si.profit_cents), 0) as total_profit
      FROM sale_items si
      JOIN products pr ON si.product_id = pr.id
      JOIN categories c ON pr.category_id = c.id
      JOIN sales s ON si.sale_id = s.id
      WHERE ${dateFilterSales}
      GROUP BY c.id
      ORDER BY total_sales DESC
      LIMIT 10
    `).all(...paramsSales);

    // 8. En Çok İşlem Yapılan Cariler (Alış + Satış hacmi)
    const topCariler = await db.prepare(`
      SELECT * FROM (
        SELECT 
          c.id,
          c.code,
          c.name,
          c.type,
          c.phone,
          c.balance_cents,
          COALESCE((SELECT SUM(s.total_amount_cents) FROM sales s WHERE s.cari_id = c.id AND ${dateFilterSales}), 0) as total_sales_volume,
          COALESCE((SELECT SUM(p.total_amount_cents) FROM purchases p WHERE p.cari_id = c.id AND ${dateFilterPurchases}), 0) as total_purchases_volume
        FROM cariler c
        WHERE c.is_deleted = 0
      ) sub
      ORDER BY (total_sales_volume + total_purchases_volume) DESC
      LIMIT 10
    `).all(...paramsSales, ...paramsPurchases);

    // 9. Günlük Trend Grafiği (Son 14 gün veya aralık içi)
    const dailySalesTrend = await db.prepare(`
      SELECT 
        s.sale_date as date,
        COUNT(s.id) as sales_count,
        COALESCE(SUM(s.total_amount_cents), 0) as sales_total,
        COALESCE(SUM(s.gross_profit_cents), 0) as gross_profit
      FROM sales s
      WHERE ${dateFilterSales}
      GROUP BY s.sale_date
      ORDER BY s.sale_date ASC
      LIMIT 30
    `).all(...paramsSales);

    res.json({
      success: true,
      isAdmin,
      summary: {
        totalSales: Number(salesSummary?.total_revenue || 0),
        salesCount: Number(salesSummary?.total_count || 0),
        totalCost: isAdmin ? Number(salesSummary?.total_cost || 0) : null,
        grossProfit: isAdmin ? grossProfit : null,
        totalPurchases: Number(purchasesSummary?.total_purchases || 0),
        purchasesCount: Number(purchasesSummary?.total_count || 0),
        totalExpenses: Number(expensesSummary?.total_expenses || 0),
        expensesCount: Number(expensesSummary?.total_count || 0),
        netProfit: isAdmin ? netProfit : null,
        totalReceivables: Number(debtReceivableReport?.total_receivables || 0),
        totalPayables: Number(debtReceivableReport?.total_payables || 0),
        debtorCount: Number(debtReceivableReport?.debtor_customers_count || 0),
        creditorCount: Number(debtReceivableReport?.creditor_suppliers_count || 0)
      },
      expensesByCategory,
      stockReport: stockReport.map(s => ({
        ...s,
        total_cost: isAdmin ? s.total_cost : null
      })),
      topCategories: topCategories.map(c => ({
        ...c,
        total_profit: isAdmin ? c.total_profit : null
      })),
      topCariler,
      dailySalesTrend: dailySalesTrend.map(t => ({
        ...t,
        gross_profit: isAdmin ? t.gross_profit : null
      }))
    });
  } catch (err) {
    console.error('Reports error:', err);
    res.status(500).json({ success: false, message: 'Rapor oluşturulurken hata: ' + err.message });
  }
});

// GET /api/reports/export/excel - Generates and downloads real Excel (.xlsx) file
router.get('/export/excel', authenticateToken, async (req, res) => {
  try {
    const { date_start, date_end } = req.query;
    const isAdmin = req.user.role === 'admin';

    const wb = XLSX.utils.book_new();

    // 1. Satışlar Sayfası
    let sWhere = 's.is_deleted = 0';
    let sParams = [];
    if (date_start) { sWhere += ' AND s.sale_date >= ?'; sParams.push(date_start); }
    if (date_end) { sWhere += ' AND s.sale_date <= ?'; sParams.push(date_end); }

    const sales = await db.prepare(`
      SELECT 
        s.invoice_no as "Fatura No",
        s.sale_date as "Tarih",
        c.name as "Müşteri",
        c.phone as "Telefon",
        s.payment_method as "Ödeme Yöntemi",
        (s.total_amount_cents / 100.0) as "Satış Tutarı (TL)",
        ${isAdmin ? '(s.cost_amount_cents / 100.0) as "Maliyet (TL)", (s.gross_profit_cents / 100.0) as "Brüt Kâr (TL)",' : ''}
        (s.collected_amount_cents / 100.0) as "Tahsil Edilen (TL)",
        (s.remaining_amount_cents / 100.0) as "Kalan Alacak (TL)",
        s.notes as "Açıklama"
      FROM sales s
      JOIN cariler c ON s.cari_id = c.id
      WHERE ${sWhere}
      ORDER BY s.sale_date DESC
    `).all(...sParams);

    const wsSales = XLSX.utils.json_to_sheet(sales);
    XLSX.utils.book_append_sheet(wb, wsSales, 'Satışlar');

    // 2. Alışlar Sayfası
    let pWhere = 'p.is_deleted = 0';
    let pParams = [];
    if (date_start) { pWhere += ' AND p.purchase_date >= ?'; pParams.push(date_start); }
    if (date_end) { pWhere += ' AND p.purchase_date <= ?'; pParams.push(date_end); }

    const purchases = await db.prepare(`
      SELECT 
        p.invoice_no as "Fatura No",
        p.purchase_date as "Tarih",
        c.name as "Tedarikçi / Cari",
        c.phone as "Telefon",
        p.payment_method as "Ödeme Yöntemi",
        (p.total_amount_cents / 100.0) as "Alış Tutarı (TL)",
        (p.paid_amount_cents / 100.0) as "Ödenen Tutar (TL)",
        (p.remaining_amount_cents / 100.0) as "Kalan Borç (TL)",
        p.notes as "Açıklama"
      FROM purchases p
      JOIN cariler c ON p.cari_id = c.id
      WHERE ${pWhere}
      ORDER BY p.purchase_date DESC
    `).all(...pParams);

    const wsPurchases = XLSX.utils.json_to_sheet(purchases);
    XLSX.utils.book_append_sheet(wb, wsPurchases, 'Alışlar');

    // 3. Stok Durumu Sayfası
    const stock = await db.prepare(`
      SELECT 
        p.product_code as "Ürün Kodu",
        p.name as "Ürün Adı",
        c.name as "Kategori",
        p.brand as "Marka",
        p.model as "Model",
        p.serial_number as "Seri No",
        p.imei as "IMEI",
        p.condition as "Durum (Sıfır/2.El)",
        p.cosmetic_grade as "Kozmetik Durum",
        ${isAdmin ? '(p.purchase_price_cents / 100.0) as "Alış Maliyeti (TL)",' : ''}
        (p.estimated_sale_price_cents / 100.0) as "Satış Fiyatı (TL)",
        p.status as "Stok Durumu",
        p.purchase_date as "Alış Tarihi"
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'in_stock' AND p.is_deleted = 0
      ORDER BY p.id DESC
    `).all();

    const wsStock = XLSX.utils.json_to_sheet(stock);
    XLSX.utils.book_append_sheet(wb, wsStock, 'Güncel Stok');

    // 4. Masraflar Sayfası
    let eWhere = 'e.is_deleted = 0';
    let eParams = [];
    if (date_start) { eWhere += ' AND e.date >= ?'; eParams.push(date_start); }
    if (date_end) { eWhere += ' AND e.date <= ?'; eParams.push(date_end); }

    const expenses = await db.prepare(`
      SELECT 
        e.expense_no as "Fiş No",
        e.date as "Tarih",
        e.category as "Kategori",
        (e.amount_cents / 100.0) as "Tutar (TL)",
        e.payment_method as "Ödeme Yöntemi",
        e.description as "Açıklama"
      FROM expenses e
      WHERE ${eWhere}
      ORDER BY e.date DESC
    `).all(...eParams);

    const wsExpenses = XLSX.utils.json_to_sheet(expenses);
    XLSX.utils.book_append_sheet(wb, wsExpenses, 'Masraflar');

    // 5. Cariler ve Borç/Alacak Sayfası
    const cariler = await db.prepare(`
      SELECT 
        c.code as "Cari Kodu",
        c.name as "Firma / Müşteri Adı",
        c.type as "Cari Tipi",
        c.phone as "Telefon",
        c.city as "Şehir",
        (c.balance_cents / 100.0) as "Bakiye (TL)",
        CASE 
          WHEN c.balance_cents > 0 THEN 'Alacağımız Var'
          WHEN c.balance_cents < 0 THEN 'Borcumuz Var'
          ELSE 'Bakiye Sıfır'
        END as "Durum"
      FROM cariler c
      WHERE c.is_deleted = 0
      ORDER BY c.name ASC
    `).all();

    const wsCariler = XLSX.utils.json_to_sheet(cariler);
    XLSX.utils.book_append_sheet(wb, wsCariler, 'Cariler');

    // Generate buffer
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const filename = `Konya_Bilgisayar_Rapor_${new Date().toISOString().substring(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(excelBuffer);
  } catch (err) {
    console.error('Excel export error:', err);
    res.status(500).json({ success: false, message: 'Excel çıktısı oluşturulamadı: ' + err.message });
  }
});

module.exports = router;
