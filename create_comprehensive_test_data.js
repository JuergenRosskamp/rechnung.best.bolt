import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function createTestData() {
  console.log('🚀 Erstelle umfangreiche Testdaten für juergen.rosskamp@gmail.com...\n');

  // 1. Hole User Info
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, tenant_id, email')
    .eq('email', 'juergen.rosskamp@gmail.com')
    .single();

  if (userError || !userData) {
    console.error('❌ User nicht gefunden:', userError);
    return;
  }

  console.log('✅ User gefunden:', userData.email);
  console.log('   Tenant ID:', userData.tenant_id);
  console.log('   User ID:', userData.id);
  console.log('');

  const tenantId = userData.tenant_id;
  const userId = userData.id;

  // 2. Erstelle Kunden (20 Stück)
  console.log('📋 Erstelle 20 Kunden...');
  const customers = [];
  for (let i = 1; i <= 20; i++) {
    const customerType = i <= 12 ? 'b2b' : i <= 18 ? 'b2c' : 'b2g';
    const cities = ['Berlin', 'Hamburg', 'München', 'Köln', 'Frankfurt'];
    const paymentTerms = ['14 Tage', '30 Tage', 'Sofort'];

    const customer = {
      tenant_id: tenantId,
      customer_type: customerType,
      company_name: i <= 12 ? `Firma ${i} GmbH` : null,
      first_name: i > 12 ? `Max${i}` : null,
      last_name: i > 12 ? `Mustermann${i}` : null,
      email: `kunde${i}@example.com`,
      phone: `+49 ${100 + i} 123456${i}`,
      address_line1: `Teststraße ${i}`,
      zip_code: String(10000 + i * 100).padStart(5, '0'),
      city: cities[i % 5],
      country: 'Deutschland',
      payment_terms: paymentTerms[i % 3],
      discount_percentage: i % 4 === 0 ? 5.0 : i % 4 === 1 ? 10.0 : 0,
      customer_notes: i % 3 === 0 ? 'VIP Kunde - Schnelle Lieferung bevorzugt' : i % 3 === 1 ? 'Stammkunde seit 2020' : null
    };
    customers.push(customer);
  }

  const { data: insertedCustomers, error: customerError } = await supabase
    .from('customers')
    .insert(customers)
    .select('id');

  if (customerError) {
    console.error('❌ Fehler beim Erstellen der Kunden:', customerError);
  } else {
    console.log(`✅ ${insertedCustomers.length} Kunden erstellt\n`);
  }

  // 3. Erstelle Artikel (25 Stück)
  console.log('📦 Erstelle 25 Artikel...');
  const articles = [];
  for (let i = 1; i <= 25; i++) {
    let name, category, unit, unitPrice;

    if (i <= 5) {
      name = `Produkt Standard ${i}`;
      category = 'Produkte';
      unit = 'Stück';
      unitPrice = 50 + i * 10;
    } else if (i <= 10) {
      name = `Produkt Premium ${i-5}`;
      category = 'Produkte';
      unit = 'Stück';
      unitPrice = 150 + i * 20;
    } else if (i <= 15) {
      name = `Dienstleistung ${i-10}`;
      category = 'Dienstleistungen';
      unit = 'Stunde';
      unitPrice = 80 + i * 5;
    } else if (i <= 20) {
      name = `Service Paket ${i-15}`;
      category = 'Services';
      unit = 'Paket';
      unitPrice = 200 + i * 15;
    } else {
      name = `Sonderartikel ${i-20}`;
      category = 'Services';
      unit = 'Set';
      unitPrice = 500 + i * 50;
    }

    const article = {
      tenant_id: tenantId,
      name: name,
      category: category,
      unit: unit,
      unit_price: unitPrice,
      vat_rate: i % 3 === 0 ? 7 : 19,
      cost_price: i <= 10 ? 30 + i * 5 : null,
      is_service: i > 10,
      description: `Testbeschreibung für Artikel ${i} mit verschiedenen Eigenschaften`
    };
    articles.push(article);
  }

  const { data: insertedArticles, error: articleError } = await supabase
    .from('articles')
    .insert(articles)
    .select('id, name, unit_price');

  if (articleError) {
    console.error('❌ Fehler beim Erstellen der Artikel:', articleError);
  } else {
    console.log(`✅ ${insertedArticles.length} Artikel erstellt\n`);
  }

  // 4. Erstelle Fahrzeuge (5 Stück)
  console.log('🚚 Erstelle 5 Fahrzeuge...');
  const vehicles = [
    { license_plate: 'B-TE 1001', vehicle_type: 'truck', brand: 'Mercedes', model: 'Sprinter', capacity_kg: 7000, capacity_m3: 20, status: 'maintenance', notes: 'Testfahrzeug 1' },
    { license_plate: 'B-TE 1002', vehicle_type: 'truck', brand: 'MAN', model: 'TGX', capacity_kg: 9000, capacity_m3: 25, status: 'active', notes: 'Testfahrzeug 2' },
    { license_plate: 'B-TE 1003', vehicle_type: 'van', brand: 'VW', model: 'Crafter', capacity_kg: 2500, capacity_m3: 6, status: 'maintenance', notes: 'Testfahrzeug 3' },
    { license_plate: 'B-TE 1004', vehicle_type: 'van', brand: 'Ford', model: 'Transit', capacity_kg: 3000, capacity_m3: 7, status: 'active', notes: 'Testfahrzeug 4' },
    { license_plate: 'B-TE 1005', vehicle_type: 'car', brand: 'BMW', model: '320d', capacity_kg: 3500, capacity_m3: 8, status: 'maintenance', notes: 'Testfahrzeug 5' }
  ].map(v => ({ ...v, tenant_id: tenantId }));

  const { data: insertedVehicles, error: vehicleError } = await supabase
    .from('vehicles')
    .insert(vehicles)
    .select('id, license_plate');

  if (vehicleError) {
    console.error('❌ Fehler beim Erstellen der Fahrzeuge:', vehicleError);
  } else {
    console.log(`✅ ${insertedVehicles.length} Fahrzeuge erstellt\n`);
  }

  // 5. Erstelle Rechnungen mit verschiedenen Status
  if (insertedCustomers && insertedCustomers.length > 0 && insertedArticles && insertedArticles.length > 0) {
    console.log('💰 Erstelle 30 Rechnungen mit verschiedenen Status...');
    const statuses = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];
    const invoices = [];
    const invoiceItems = [];

    for (let i = 1; i <= 30; i++) {
      const customer = insertedCustomers[i % insertedCustomers.length];
      const daysAgo = Math.floor(i * 3);
      const invoiceDate = new Date();
      invoiceDate.setDate(invoiceDate.getDate() - daysAgo);

      const status = statuses[i % statuses.length];

      const invoice = {
        tenant_id: tenantId,
        customer_id: customer.id,
        invoice_number: `RE-2024-${String(i).padStart(4, '0')}`,
        invoice_date: invoiceDate.toISOString().split('T')[0],
        due_date: new Date(invoiceDate.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: status,
        subtotal: 0,
        vat_amount: 0,
        total: 0,
        notes: `Testrechnung ${i}`,
        payment_terms: '14 Tage netto',
        created_by: userId
      };
      invoices.push(invoice);
    }

    const { data: insertedInvoices, error: invoiceError } = await supabase
      .from('invoices')
      .insert(invoices)
      .select('id, invoice_number');

    if (invoiceError) {
      console.error('❌ Fehler beim Erstellen der Rechnungen:', invoiceError);
    } else {
      console.log(`✅ ${insertedInvoices.length} Rechnungen erstellt`);

      // Erstelle Rechnungspositionen
      console.log('   Erstelle Rechnungspositionen...');
      for (const invoice of insertedInvoices) {
        const numItems = Math.floor(Math.random() * 5) + 1;
        for (let j = 0; j < numItems; j++) {
          const article = insertedArticles[Math.floor(Math.random() * insertedArticles.length)];
          const quantity = Math.floor(Math.random() * 10) + 1;
          const unitPrice = article.unit_price;
          const vatRate = Math.random() > 0.5 ? 19 : 7;
          const lineTotal = quantity * unitPrice;
          const vatAmount = lineTotal * (vatRate / 100);

          invoiceItems.push({
            invoice_id: invoice.id,
            article_id: article.id,
            description: article.name,
            quantity: quantity,
            unit_price: unitPrice,
            vat_rate: vatRate,
            line_total: lineTotal,
            vat_amount: vatAmount
          });
        }
      }

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems);

      if (itemsError) {
        console.error('❌ Fehler beim Erstellen der Rechnungspositionen:', itemsError);
      } else {
        console.log(`✅ ${invoiceItems.length} Rechnungspositionen erstellt\n`);
      }
    }
  }

  // 6. Erstelle Angebote
  if (insertedCustomers && insertedCustomers.length > 0 && insertedArticles && insertedArticles.length > 0) {
    console.log('📝 Erstelle 10 Angebote...');
    const quoteStatuses = ['draft', 'sent', 'accepted', 'declined'];
    const quotes = [];

    for (let i = 1; i <= 10; i++) {
      const customer = insertedCustomers[i % insertedCustomers.length];
      const daysAgo = Math.floor(i * 2);
      const quoteDate = new Date();
      quoteDate.setDate(quoteDate.getDate() - daysAgo);

      const quote = {
        tenant_id: tenantId,
        customer_id: customer.id,
        quote_number: `ANG-2024-${String(i).padStart(4, '0')}`,
        quote_date: quoteDate.toISOString().split('T')[0],
        valid_until: new Date(quoteDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: quoteStatuses[i % quoteStatuses.length],
        subtotal: 0,
        vat_amount: 0,
        total: 0,
        notes: `Testangebot ${i}`,
        created_by: userId
      };
      quotes.push(quote);
    }

    const { data: insertedQuotes, error: quoteError } = await supabase
      .from('quotes')
      .insert(quotes)
      .select('id');

    if (quoteError) {
      console.error('❌ Fehler beim Erstellen der Angebote:', quoteError);
    } else {
      console.log(`✅ ${insertedQuotes.length} Angebote erstellt\n`);
    }
  }

  // 7. Erstelle Kassenbuch-Einträge
  console.log('💵 Erstelle 40 Kassenbuch-Einträge...');
  const cashbookEntries = [];
  const categories = ['Büromaterial', 'Porto', 'Fahrtkosten', 'Bewirtung', 'Sonstige'];

  for (let i = 1; i <= 40; i++) {
    const daysAgo = Math.floor(i * 2);
    const entryDate = new Date();
    entryDate.setDate(entryDate.getDate() - daysAgo);

    const isIncome = i % 5 === 0;
    const amount = Math.floor(Math.random() * 500) + 10;
    const vatRate = i % 3 === 0 ? 7 : 19;
    const vatAmount = amount * (vatRate / 100);

    const entry = {
      tenant_id: tenantId,
      entry_date: entryDate.toISOString().split('T')[0],
      document_type: isIncome ? 'income' : 'expense',
      category_id: categories[i % categories.length],
      description: `Kassenbuch Eintrag ${i} - ${isIncome ? 'Einnahme' : 'Ausgabe'}`,
      amount: amount,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      reference: `KB-${String(i).padStart(4, '0')}`
    };
    cashbookEntries.push(entry);
  }

  const { data: insertedEntries, error: entriesError } = await supabase
    .from('cashbook_entries')
    .insert(cashbookEntries)
    .select('id');

  if (entriesError) {
    console.error('❌ Fehler beim Erstellen der Kassenbuch-Einträge:', entriesError);
  } else {
    console.log(`✅ ${insertedEntries.length} Kassenbuch-Einträge erstellt\n`);
  }

  // 8. Erstelle Lieferungen
  if (insertedVehicles && insertedVehicles.length > 0) {
    console.log('🚛 Erstelle 15 Lieferungen...');
    const deliveryStatuses = ['planned', 'in_progress', 'completed', 'cancelled'];
    const deliveries = [];

    for (let i = 1; i <= 15; i++) {
      const vehicle = insertedVehicles[i % insertedVehicles.length];
      const daysAgo = Math.floor(i * 1.5);
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() - daysAgo);

      const delivery = {
        tenant_id: tenantId,
        vehicle_id: vehicle.id,
        delivery_date: deliveryDate.toISOString().split('T')[0],
        status: deliveryStatuses[i % deliveryStatuses.length],
        notes: `Testlieferung ${i}`
      };
      deliveries.push(delivery);
    }

    const { data: insertedDeliveries, error: deliveryError } = await supabase
      .from('deliveries')
      .insert(deliveries)
      .select('id');

    if (deliveryError) {
      console.error('❌ Fehler beim Erstellen der Lieferungen:', deliveryError);
    } else {
      console.log(`✅ ${insertedDeliveries.length} Lieferungen erstellt\n`);
    }
  }

  console.log('🎉 Alle Testdaten erfolgreich erstellt!');
  console.log('\n📊 Zusammenfassung:');
  console.log(`   - Kunden: ${insertedCustomers?.length || 0}`);
  console.log(`   - Artikel: ${insertedArticles?.length || 0}`);
  console.log(`   - Fahrzeuge: ${insertedVehicles?.length || 0}`);
  console.log(`   - Rechnungen: 30`);
  console.log(`   - Angebote: 10`);
  console.log(`   - Kassenbuch-Einträge: 40`);
  console.log(`   - Lieferungen: 15`);
}

createTestData().catch(console.error);
