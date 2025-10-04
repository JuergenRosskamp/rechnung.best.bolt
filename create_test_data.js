import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function createTestData() {
  console.log('🚀 Erstelle Testdaten für juergen.rosskamp@gmail.com...\n');

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

  // 2. Erstelle Kunden
  console.log('📋 Erstelle 20 Kunden...');
  const customers = [];
  for (let i = 1; i <= 20; i++) {
    const customerType = i <= 12 ? 'b2b' : i <= 18 ? 'b2c' : 'b2g';
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
      city: ['Berlin', 'Hamburg', 'München', 'Köln', 'Frankfurt'][i % 5],
      country: 'Deutschland',
      payment_terms: ['14 Tage', '30 Tage', 'Sofort'][i % 3],
      discount_percentage: [5.0, 10.0, 0][i % 4 === 0 ? 0 : i % 4 === 1 ? 1 : 2],
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
    return;
  }
  console.log(`✅ ${insertedCustomers.length} Kunden erstellt\n`);

  // 3. Erstelle Artikel
  console.log('📦 Erstelle 25 Artikel...');
  const articles = [];
  for (let i = 1; i <= 25; i++) {
    const article = {
      tenant_id: tenantId,
      name: i <= 5 ? `Produkt Standard ${i}` : i <= 10 ? `Produkt Premium ${i-5}` : i <= 15 ? `Dienstleistung ${i-10}` : i <= 20 ? `Service Paket ${i-15}` : `Sonderartikel ${i-20}`,
      category: i <= 10 ? 'Produkte' : i <= 15 ? 'Dienstleistungen' : 'Services',
      unit: i <= 10 ? 'Stück' : i <= 15 ? 'Stunde' : i <= 20 ? 'Paket' : 'Set',
      unit_price: i <= 5 ? 50 + i * 10 : i <= 10 ? 150 + i * 20 : i <= 15 ? 80 + i * 5 : i <= 20 ? 200 + i * 15 : 500 + i * 50,
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
    .select('id');

  if (articleError) {
    console.error('❌ Fehler beim Erstellen der Artikel:', articleError);
    return;
  }
  console.log(`✅ ${insertedArticles.length} Artikel erstellt\n`);

  // 4. Erstelle Fahrzeuge
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
    .select('id');

  if (vehicleError) {
    console.error('❌ Fehler beim Erstellen der Fahrzeuge:', vehicleError);
    return;
  }
  console.log(`✅ ${insertedVehicles.length} Fahrzeuge erstellt\n`);

  console.log('🎉 Testdaten erfolgreich erstellt!');
  console.log('\n📊 Zusammenfassung:');
  console.log(`   - Kunden: ${insertedCustomers.length}`);
  console.log(`   - Artikel: ${insertedArticles.length}`);
  console.log(`   - Fahrzeuge: ${insertedVehicles.length}`);
}

createTestData().catch(console.error);
