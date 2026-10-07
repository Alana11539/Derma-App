# Dr. Salman Skin & Hair Clinic

Marketing website and admin panel for Dr. Salman Skin & Hair Clinic (Lahore, Pakistan).

A client-side React SPA — services, before/after gallery, blog, reviews, plus a
password-protected admin area for managing treatments, blog posts, reviews and
before/after entries.

## Stack

| Concern | Choice |
| --- | --- |
| Build tool | Vite 8 |
| UI | React 19 |
| Styling | Tailwind CSS v4 (`@theme` tokens in `src/index.css`) |
| Routing | react-router-dom v7 |
| Animation | framer-motion, swiper |
| Icons / meta | react-icons, react-helmet-async |
| Lint | oxlint |

## Getting started

```bash
npm install
cp .env.example .env   # then fill in the admin credentials
npm run dev
```

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server with HMR |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run oxlint |

## Routes

**Public** — `/`, `/services`, `/before-after`, `/blogs`, `/blogs/:slug`,
`/reviews`, `/privacy-policy`, `/terms`

**Admin** (auth required) — `/admin/dashboard`, `/admin/treatments`,
`/admin/blogs`, `/admin/reviews`, `/admin/before-after`, `/admin/login`

Every route is code-split with `React.lazy`; unknown paths redirect to `/`.

## Project layout

```
src/
  components/
    admin/       Admin CRUD screens (forms, tables, shared modal/dialog)
    beforeAfter/ Before/after comparison slider
    blogs/        Blog card + sidebar
    common/       Button, SEO, SectionHeading, LazyImage, ProtectedRoute...
    home/         Landing page sections
    layout/       Navbar, Footer, Layout shell
    reviews/      Review card, form, rating breakdown
  data/           Seed content + site config
  hooks/          useScrollToTop
  layouts/        AdminLayout
  pages/          One file per route (public + admin/)
  services/       Data access layer (see below)
  utils/          whatsapp helpers, framer-motion variants
```

## Data & the service layer

The backend lives in `backend/` (Express + MongoDB Atlas). `src/services/*.js`
exposes a stable async API that calls the backend through `src/services/api.js`,
a thin `fetch` wrapper pointed at `VITE_API_BASE_URL` and attaching the admin JWT
automatically. Pages and components only talk to the service modules.

See [`backend/README.md`](backend/README.md) for local setup, MongoDB Atlas and
Vercel deployment instructions.

## Environment variables

See `.env.example`.

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Backend base URL (defaults to `http://localhost:5000/api`) |
| `VITE_WHATSAPP_NUMBER` | WhatsApp number in international format |

> ### Deployment note
>
> Admin authentication is handled server-side by the backend (bcrypt + JWT).
> Nothing sensitive is compiled into the frontend bundle. In production, set
> `VITE_API_BASE_URL` to the deployed backend URL and add the frontend origin to
> the backend's `CLIENT_URL` so CORS allows browser requests.

## Notes

- `public/robots.txt` and `public/sitemap.xml` are hand-maintained. Update them
  when public routes change, including new blog post slugs.
- Icons are imported by name (`import { MdSpa } from 'react-icons/md'`) so only
  the used glyphs are bundled. Avoid `import * as Icons from 'react-icons/md'`.