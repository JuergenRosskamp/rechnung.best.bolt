# rechnung.best - Quick Start Guide

**🚀 Get up and running in 15 minutes**

---

## Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works)
- Git

---

## Step 1: Clone & Install (2 minutes)

```bash
# Clone repository
git clone <repository-url>
cd rechnung-best

# Install dependencies
npm install
```

---

## Step 2: Set Up Supabase (5 minutes)

### 2.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Name: `rechnung-best`
4. Database password: Save this securely
5. Region: Choose closest to your users
6. Click "Create new project"

### 2.2 Get Project Credentials
1. In your Supabase project, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public key** (starts with `eyJ...`)

### 2.3 Configure Environment
Create `.env` file in project root:

```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-anon-key...
```

---

## Step 3: Run Database Migrations (3 minutes)

### 3.1 Install Supabase CLI
```bash
# macOS/Linux
brew install supabase/tap/supabase

# Windows (PowerShell)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### 3.2 Link to Your Project
```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref <your-project-ref>
```

Your project ref is in the Project URL: `https://<project-ref>.supabase.co`

### 3.3 Push Migrations
```bash
supabase db push
```

This creates all 12 tables with Row Level Security enabled.

---

## Step 4: Deploy Edge Functions (3 minutes)

Deploy the three PDF/XML generators:

```bash
# Deploy PDF generator
supabase functions deploy generate-invoice-pdf

# Deploy XRechnung generator
supabase functions deploy generate-xrechnung

# Deploy ZUGFeRD generator
supabase functions deploy generate-zugferd
```

---

## Step 5: Start Development Server (1 minute)

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Step 6: Create Your First User (2 minutes)

### 6.1 Sign Up
1. Click "Register" on login page
2. Enter email and password
3. You'll receive a confirmation email (check spam)
4. Click confirmation link

### 6.2 Create Tenant Record
Since this is the first user, you need to manually create a tenant record in Supabase:

1. Go to Supabase Dashboard → **Table Editor**
2. Open `tenants` table
3. Click **Insert row**
4. Fill in:
   - **company_name**: Your Company Name
   - **country**: DE
   - Leave other fields empty for now
5. Click **Save**
6. Copy the generated `id` (UUID)

### 6.3 Link User to Tenant
1. Go to `users` table
2. Find your user row (by email)
3. Click **Edit**
4. Set **tenant_id** to the UUID you copied
5. Set **role** to `admin`
6. Click **Save**

### 6.4 Create Subscription
1. Go to `subscriptions` table
2. Click **Insert row**
3. Fill in:
   - **tenant_id**: Same UUID from step 6.2
   - **plan_type**: rechnung.best
   - **status**: trialing
   - **trial_ends_at**: 30 days from now
4. Click **Save**

Now log out and log back in. You should see the dashboard!

---

## Step 7: Create Test Data (Optional)

### 7.1 Create a Customer
1. Go to **Customers** page
2. Click **New Customer**
3. Fill in test data:
   - Display Name: Test Customer GmbH
   - Email: test@example.com
   - Address: Teststraße 123
   - ZIP: 10115
   - City: Berlin
4. Click **Save**

### 7.2 Create an Article
1. Go to **Articles** page
2. Click **New Article**
3. Fill in:
   - Name: Consulting Services
   - Category: Services
   - Unit Price: 100.00
   - Unit: hours
   - VAT Rate: 19
4. Click **Save**

### 7.3 Create an Invoice
1. Go to **Invoices** page
2. Click **New Invoice**
3. Select customer and add items
4. Click **Save**

### 7.4 Generate PDFs
Now you can test the PDF generators:
1. Open the invoice detail page
2. Click **Download PDF** (standard)
3. Click **Download XRechnung** (XML)
4. Click **Download ZUGFeRD** (hybrid PDF)

---

## Common Issues & Solutions

### Issue: "Failed to connect to Supabase"
**Solution:**
- Check `.env` file exists and has correct values
- Restart dev server after changing `.env`
- Make sure Supabase project is not paused (free tier auto-pauses after 1 week inactivity)

### Issue: "Row Level Security policy violation"
**Solution:**
- Make sure you linked user to tenant in Step 6
- Check that tenant exists in `tenants` table
- Verify `tenant_id` is correctly set in `users` table

### Issue: "Edge function returns 401"
**Solution:**
- You must be logged in to call edge functions
- JWT token is automatically included in Authorization header
- Check browser console for authentication errors

### Issue: "PDF generation returns 404"
**Solution:**
- Make sure edge functions are deployed: `supabase functions list`
- Check function logs: `supabase functions logs generate-invoice-pdf`
- Verify invoice exists and belongs to your tenant

---

## Development Workflow

### Running Locally
```bash
# Start dev server (hot reload)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type check
npm run typecheck

# Lint code
npm run lint
```

### Database Commands
```bash
# Create new migration
supabase migration new <migration-name>

# Push migrations
supabase db push

# Reset local database
supabase db reset

# Diff local vs remote
supabase db diff
```

### Edge Functions
```bash
# List deployed functions
supabase functions list

# View function logs
supabase functions logs <function-name>

# Delete function
supabase functions delete <function-name>

# Test function locally (requires Docker)
supabase functions serve
```

---

## Project Structure

```
rechnung-best/
├── src/
│   ├── components/       # React components
│   │   └── Layout.tsx    # Main layout wrapper
│   ├── pages/            # Page components (routes)
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── InvoicesPage.tsx
│   │   └── ...
│   ├── lib/              # Utilities
│   │   ├── supabase.ts   # Supabase client
│   │   ├── auth.ts       # Auth helpers
│   │   └── errors.ts     # Error handling
│   ├── store/            # State management (Zustand)
│   │   └── authStore.ts  # Auth state
│   ├── types/            # TypeScript types
│   │   ├── index.ts      # Shared types
│   │   └── database.ts   # Database types
│   ├── App.tsx           # Main app component
│   └── main.tsx          # Entry point
├── supabase/
│   ├── migrations/       # Database migrations
│   │   └── 202509...sql  # Initial schema
│   └── functions/        # Edge functions
│       ├── generate-invoice-pdf/
│       ├── generate-xrechnung/
│       └── generate-zugferd/
├── .env                  # Environment variables (create this)
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## Next Steps

### Learning Resources
- [Supabase Docs](https://supabase.com/docs)
- [React Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

### Feature Development
1. Read `IMPLEMENTATION_STATUS.md` for current status
2. Check `PROJECT_SUMMARY.md` for architecture overview
3. Pick a feature from "What's Next" section
4. Create a new branch: `git checkout -b feature/your-feature`
5. Implement and test
6. Submit PR

### Production Deployment
1. Deploy frontend to Vercel/Netlify
2. Edge functions are already deployed to Supabase
3. Set environment variables in hosting platform
4. Enable custom domain (optional)
5. Set up monitoring (Sentry recommended)

---

## Getting Help

### Documentation
- **IMPLEMENTATION_STATUS.md** - Detailed technical status
- **PROJECT_SUMMARY.md** - High-level overview
- **QA_REPORT_FINAL.md** - Quality assurance report

### Supabase Support
- [Discord](https://discord.supabase.com)
- [GitHub Discussions](https://github.com/supabase/supabase/discussions)

### Issue Tracking
- Open issues on GitHub
- Tag with appropriate labels (bug, feature, question)

---

## Security Checklist

Before going to production:

- [ ] Change default passwords
- [ ] Enable 2FA on Supabase account
- [ ] Set up database backups
- [ ] Configure CORS properly
- [ ] Add rate limiting
- [ ] Enable logging
- [ ] Set up monitoring
- [ ] Review RLS policies
- [ ] Audit user roles
- [ ] Test tenant isolation

---

## Testing Your Setup

Run these checks to verify everything works:

```bash
# 1. Frontend builds successfully
npm run build

# 2. Type checking passes
npm run typecheck

# 3. Linting passes
npm run lint

# 4. Database migrations applied
supabase db diff # Should show no differences

# 5. Edge functions deployed
supabase functions list # Should show 3 functions

# 6. Authentication works
# Log in via UI and check browser console for JWT token

# 7. Generate a PDF
# Create test invoice and click "Download PDF"
```

If all checks pass, you're ready to develop! 🎉

---

**Happy coding!** 🚀

For questions or issues, check the documentation files or open an issue on GitHub.
