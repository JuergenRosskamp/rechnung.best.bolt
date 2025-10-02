import { useState } from 'react';
import {
  FileText,
  Shield,
  Zap,
  Globe,
  CheckCircle,
  ArrowRight,
  Menu,
  X,
  Lock,
  TrendingUp,
  Clock,
  Users,
  Mail,
  Phone,
  ChevronDown
} from 'lucide-react';

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  const features = [
    {
      icon: FileText,
      title: 'Professionelle Rechnungen',
      description: 'Erstellen Sie rechtssichere Rechnungen nach § 14 UStG mit allen Pflichtangaben in Sekunden.'
    },
    {
      icon: Shield,
      title: 'GoBD-konform',
      description: 'Unveränderbare Archivierung und vollständige Nachvollziehbarkeit nach GoBD-Vorgaben.'
    },
    {
      icon: Zap,
      title: 'Schnell & Einfach',
      description: 'Intuitive Benutzeroberfläche für maximale Effizienz. Keine Einarbeitung notwendig.'
    },
    {
      icon: Globe,
      title: 'EU-ready',
      description: 'Reverse-Charge für EU-Geschäfte und Kleinunternehmerregelung § 19 UStG integriert.'
    },
    {
      icon: Lock,
      title: '100% Datenschutz',
      description: 'DSGVO-konform. Ihre Daten werden sicher in Deutschland gespeichert.'
    },
    {
      icon: TrendingUp,
      title: 'Übersichtliches Dashboard',
      description: 'Behalten Sie Ihre Finanzen im Blick mit aussagekräftigen Statistiken und Reports.'
    }
  ];

  const benefits = [
    'Keine versteckten Kosten',
    'Monatlich kündbar',
    'Unbegrenzte Rechnungen',
    'Kundenverwaltung inklusive',
    'Artikelverwaltung',
    'Lieferscheine',
    'Kassenbuch (GoBD)',
    'E-Mail Support',
    'Regelmäßige Updates'
  ];

  const faqs = [
    {
      question: 'Ist das System GoBD-konform?',
      answer: 'Ja, unser System erfüllt alle Anforderungen der GoBD (Grundsätze zur ordnungsmäßigen Führung und Aufbewahrung von Büchern). Rechnungen werden unveränderbar archiviert und mit einem SHA-256 Hash gesichert.'
    },
    {
      question: 'Werden alle steuerlichen Pflichtangaben nach § 14 UStG berücksichtigt?',
      answer: 'Absolut. Alle Rechnungen enthalten automatisch alle gesetzlich vorgeschriebenen Angaben gemäß § 14 UStG: Vollständige Adressen, Steuernummer/USt-IdNr., fortlaufende Rechnungsnummer, Leistungsdatum, Steuersätze und -beträge.'
    },
    {
      question: 'Kann ich die Kleinunternehmerregelung nutzen?',
      answer: 'Ja, die Kleinunternehmerregelung nach § 19 UStG ist vollständig integriert. Sie können den gesetzlich vorgeschriebenen Hinweistext anpassen und Rechnungen ohne Umsatzsteuer erstellen.'
    },
    {
      question: 'Wie funktioniert die Datensicherheit?',
      answer: 'Ihre Daten werden ausschließlich auf deutschen Servern gespeichert und sind durch modernste Verschlüsselungstechnologie geschützt. Wir sind vollständig DSGVO-konform und führen regelmäßige Sicherheitsaudits durch.'
    },
    {
      question: 'Kann ich das System kostenlos testen?',
      answer: 'Ja, Sie können das System 14 Tage lang kostenlos und unverbindlich testen. Keine Kreditkarte erforderlich. Nach Ablauf der Testphase können Sie entscheiden, ob Sie weitermachen möchten.'
    },
    {
      question: 'Eignet sich das System für Lieferdienste?',
      answer: 'Definitiv! Das System wurde speziell auch für Lieferdienste entwickelt und bietet Features wie Tourplanung, Lieferscheine, Lieferorteverwaltung und Fahrzeugverwaltung.'
    },
    {
      question: 'Kann ich meine bestehenden Kundendaten importieren?',
      answer: 'Ja, Sie können Ihre Kundendaten einfach importieren. Kontaktieren Sie unseren Support für Hilfe beim Import größerer Datenmengen.'
    },
    {
      question: 'Wie funktioniert der Support?',
      answer: 'Wir bieten E-Mail-Support während der Geschäftszeiten (Mo-Fr 9-17 Uhr). Premium-Kunden erhalten bevorzugten Support mit schnellerer Reaktionszeit.'
    }
  ];

  const handleGetStarted = () => {
    window.location.href = '/register';
  };

  const handleLogin = () => {
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">rechnung.best</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <button onClick={() => scrollToSection('features')} className="text-gray-600 hover:text-gray-900">
                Features
              </button>
              <button onClick={() => scrollToSection('pricing')} className="text-gray-600 hover:text-gray-900">
                Preise
              </button>
              <button onClick={() => scrollToSection('faq')} className="text-gray-600 hover:text-gray-900">
                FAQ
              </button>
              <button
                onClick={handleLogin}
                className="text-gray-600 hover:text-gray-900"
              >
                Login
              </button>
              <button
                onClick={handleGetStarted}
                className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Kostenlos starten
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-600 hover:text-gray-900"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200">
            <div className="px-4 py-3 space-y-3">
              <button onClick={() => scrollToSection('features')} className="block w-full text-left text-gray-600 hover:text-gray-900">
                Features
              </button>
              <button onClick={() => scrollToSection('pricing')} className="block w-full text-left text-gray-600 hover:text-gray-900">
                Preise
              </button>
              <button onClick={() => scrollToSection('faq')} className="block w-full text-left text-gray-600 hover:text-gray-900">
                FAQ
              </button>
              <button
                onClick={handleLogin}
                className="block w-full text-left text-gray-600 hover:text-gray-900"
              >
                Login
              </button>
              <button
                onClick={handleGetStarted}
                className="w-full bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Kostenlos starten
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Professionelle Rechnungen<br />
            <span className="text-blue-200">in Sekunden erstellen</span>
          </h1>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            GoBD-konform, rechtssicher nach § 14 UStG und kinderleicht zu bedienen.
            Perfekt für Selbstständige, kleine Unternehmen und Lieferdienste.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={handleGetStarted}
              className="bg-emerald-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2"
            >
              14 Tage kostenlos testen
              <ArrowRight className="h-5 w-5" />
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="bg-white text-blue-900 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              Mehr erfahren
            </button>
          </div>
          <p className="text-blue-200 mt-4 text-sm">
            Keine Kreditkarte erforderlich • Keine versteckten Kosten • Monatlich kündbar
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Alles, was Sie für professionelle Rechnungen brauchen
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Rechtssicher, GoBD-konform und einfach zu bedienen
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Ihre Vorteile auf einen Blick
              </h2>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 text-lg">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-8 rounded-2xl">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm">
                  <Clock className="h-8 w-8 text-blue-600 mb-2" />
                  <div className="text-3xl font-bold text-gray-900">5 Min</div>
                  <div className="text-gray-600 text-sm">Bis zur ersten Rechnung</div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm">
                  <Users className="h-8 w-8 text-blue-600 mb-2" />
                  <div className="text-3xl font-bold text-gray-900">1000+</div>
                  <div className="text-gray-600 text-sm">Zufriedene Nutzer</div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm">
                  <Shield className="h-8 w-8 text-blue-600 mb-2" />
                  <div className="text-3xl font-bold text-gray-900">100%</div>
                  <div className="text-gray-600 text-sm">GoBD-Konform</div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm">
                  <TrendingUp className="h-8 w-8 text-blue-600 mb-2" />
                  <div className="text-3xl font-bold text-gray-900">99.9%</div>
                  <div className="text-gray-600 text-sm">Verfügbarkeit</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Einfache, transparente Preise
            </h2>
            <p className="text-xl text-gray-600">
              Keine versteckten Kosten. Jederzeit kündbar.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Starter */}
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Starter</h3>
              <p className="text-gray-600 mb-6">Für Einsteiger</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">9,90 €</span>
                <span className="text-gray-600">/Monat</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Bis zu 50 Rechnungen/Monat</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Kundenverwaltung</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">GoBD-konform</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">E-Mail Support</span>
                </li>
              </ul>
              <button
                onClick={handleGetStarted}
                className="w-full bg-gray-900 text-white py-3 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Jetzt starten
              </button>
            </div>

            {/* Professional - Highlighted */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-lg p-8 relative transform md:scale-105">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-emerald-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                Beliebteste Wahl
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Professional</h3>
              <p className="text-blue-100 mb-6">Für Profis</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">19,90 €</span>
                <span className="text-blue-100">/Monat</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-white">Unbegrenzte Rechnungen</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-white">Alle Starter Features</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-white">Lieferscheine & Kassenbuch</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-white">Prioritäts-Support</span>
                </li>
              </ul>
              <button
                onClick={handleGetStarted}
                className="w-full bg-white text-blue-600 py-3 rounded-lg hover:bg-blue-50 transition-colors font-semibold"
              >
                Jetzt starten
              </button>
            </div>

            {/* Enterprise */}
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Enterprise</h3>
              <p className="text-gray-600 mb-6">Für Teams</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">49,90 €</span>
                <span className="text-gray-600">/Monat</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Alle Professional Features</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Multi-User (bis 5 Nutzer)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">API-Zugang</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Premium Support</span>
                </li>
              </ul>
              <button
                onClick={handleGetStarted}
                className="w-full bg-gray-900 text-white py-3 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Jetzt starten
              </button>
            </div>
          </div>

          <p className="text-center text-gray-600 mt-8">
            Alle Preise inkl. MwSt. • 14 Tage kostenlos testen • Monatlich kündbar
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Häufig gestellte Fragen
            </h2>
            <p className="text-xl text-gray-600">
              Alles, was Sie wissen müssen
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-gray-50 rounded-lg overflow-hidden">
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
                >
                  <span className="font-semibold text-gray-900">{faq.question}</span>
                  <ChevronDown
                    className={`h-5 w-5 text-gray-600 transition-transform ${
                      openFaqIndex === index ? 'transform rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaqIndex === index && (
                  <div className="px-6 py-4 bg-white border-t border-gray-200">
                    <p className="text-gray-700">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Bereit, professionelle Rechnungen zu erstellen?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Starten Sie jetzt kostenlos und überzeugen Sie sich selbst.
          </p>
          <button
            onClick={handleGetStarted}
            className="bg-emerald-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-emerald-700 transition-colors inline-flex items-center gap-2"
          >
            14 Tage kostenlos testen
            <ArrowRight className="h-5 w-5" />
          </button>
          <p className="text-blue-200 mt-4 text-sm">
            Keine Kreditkarte erforderlich
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center mb-4">
                <FileText className="h-6 w-6 text-blue-400" />
                <span className="ml-2 text-lg font-bold text-white">rechnung.best</span>
              </div>
              <p className="text-sm text-gray-400">
                Professionelle Rechnungssoftware für Selbstständige und Unternehmen.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Produkt</h4>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => scrollToSection('features')} className="hover:text-white">Features</button></li>
                <li><button onClick={() => scrollToSection('pricing')} className="hover:text-white">Preise</button></li>
                <li><button onClick={() => scrollToSection('faq')} className="hover:text-white">FAQ</button></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Rechtliches</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="/impressum" className="hover:text-white">Impressum</a></li>
                <li><a href="/datenschutz" className="hover:text-white">Datenschutz</a></li>
                <li><a href="/agb" className="hover:text-white">AGB</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Kontakt</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>info@rechnung.best</span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>+49 (0) 30 1234567</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8">
            <div className="text-center text-sm text-gray-400">
              <p className="mb-2">
                © 2025 rechnung.best. Alle Rechte vorbehalten.
              </p>
              <p className="text-xs">
                Made with ❤️ in Germany • DSGVO-konform • Daten in Deutschland gespeichert
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
