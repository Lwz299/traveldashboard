import { useState } from 'react'
import './App.css'
import { Button } from './components/ui/button.jsx'

function App() {
  const [activeSection, setActiveSection] = useState('dashboard')

  const sections = [
    { id: 'dashboard', title: 'Dashboard', description: 'Overview of your vendor dashboard' },
    { id: 'auth', title: 'Authentication', description: 'Login and user management' },
    { id: 'events', title: 'Event Management', description: 'Create and manage events' },
    { id: 'agenda', title: 'Agenda & Forms', description: 'Manage event agendas and custom forms' },
    { id: 'attendees', title: 'Attendee Management', description: 'Manage event attendees and segments' },
    { id: 'field', title: 'Field Operations', description: 'Check-in and on-site operations' },
    { id: 'reports', title: 'Reports & Wallet', description: 'View reports and manage payouts' },
  ]

  const renderContent = () => {
    switch (activeSection) {
      case 'auth':
        return <AuthSection />
      case 'events':
        return <EventsSection />
      case 'agenda':
        return <AgendaSection />
      case 'attendees':
        return <AttendeesSection />
      case 'field':
        return <FieldSection />
      case 'reports':
        return <ReportsSection />
      default:
        return <DashboardOverview />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Vendor Dashboard</h1>
        </div>
      </header>
      <div className="flex">
        <nav className="w-64 border-r p-4">
          <ul className="space-y-2">
            {sections.map(section => (
              <li key={section.id}>
                <Button
                  variant={activeSection === section.id ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setActiveSection(section.id)}
                >
                  {section.title}
                </Button>
              </li>
            ))}
          </ul>
        </nav>
        <main className="flex-1 p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  )
}

function DashboardOverview() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Dashboard Overview</h2>
      <p>Welcome to your Vendor Dashboard. Select a section from the sidebar to get started.</p>
    </div>
  )
}

function AuthSection() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Authentication</h2>
      <p>API: POST /api/organization-accounts/login</p>
      <p>Manage login and authentication for your organization.</p>
      {/* Add login form here */}
    </div>
  )
}

function EventsSection() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Event Management</h2>
      <p>APIs:</p>
      <ul>
        <li>GET /api/events - View all events</li>
        <li>POST /api/events - Create new event</li>
        <li>PUT /api/events/{'{id}'} - Update event</li>
        <li>DELETE /api/events/{'{id}'} - Delete event</li>
      </ul>
      {/* Add event management UI */}
    </div>
  )
}

function AgendaSection() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Agenda & Custom Forms</h2>
      <p>APIs:</p>
      <ul>
        <li>GET /api/events/{'{id}'}/agenda - View agenda</li>
        <li>POST /api/events/{'{id}'}/agenda - Add agenda item</li>
        <li>GET /api/events/{'{id}'}/questions - View questions</li>
        <li>POST /api/events/{'{id}'}/questions - Add question</li>
      </ul>
      {/* Add agenda and forms UI */}
    </div>
  )
}

function AttendeesSection() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Attendee Management</h2>
      <p>APIs:</p>
      <ul>
        <li>GET /api/user-segments - View segments</li>
        <li>POST /api/user-segments - Create segment</li>
        <li>POST /api/user-segments/{'{segmentId}'}/users/{'{userId}'} - Add user to segment</li>
        <li>POST /api/notifications/in-app/event/{'{eventId}'} - In-app notify ticket holders (title, body)</li>
        <li>POST /api/notifications/in-app/organization - In-app notify org purchasers (title, body)</li>
        <li>POST /api/notifications/push/{'{userId}'} - Push/log (FCM later)</li>
      </ul>
      {/* Add attendee management UI */}
    </div>
  )
}

function FieldSection() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Field Operations</h2>
      <p>API: POST /api/tickets/verify/{'{qrCode}'} - Verify ticket</p>
      <p>Handle on-site check-ins and ticket verification.</p>
      {/* Add check-in UI */}
    </div>
  )
}

function ReportsSection() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Reports & Wallet</h2>
      <p>APIs:</p>
      <ul>
        <li>GET /api/reports/event-performance/{'{eventId}'} - Event performance</li>
        <li>GET /api/reports/organization-summary - Organization summary</li>
        <li>GET /api/payouts/my-wallet - Wallet balance</li>
        <li>GET /api/payouts/history - Payout history</li>
        <li>POST /api/payouts/request - Request payout</li>
      </ul>
      {/* Add reports and wallet UI */}
    </div>
  )
}

export default App
            Edit <code>src/App.jsx</code> and save to test <code>HMR</code>
          </p>
        </div>
        <button
          className="counter"
          onClick={() => setCount((count) => count + 1)}
        >
          Count is {count}
        </button>
      </section>

      <div className="ticks"></div>

      <section id="next-steps">
        <div id="docs">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon"></use>
          </svg>
          <h2>Documentation</h2>
          <p>Your questions, answered</p>
          <ul>
            <li>
              <a href="https://vite.dev/" target="_blank">
                <img className="logo" src={viteLogo} alt="" />
                Explore Vite
              </a>
            </li>
            <li>
              <a href="https://react.dev/" target="_blank">
                <img className="button-icon" src={reactLogo} alt="" />
                Learn more
              </a>
            </li>
          </ul>
        </div>
        <div id="social">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2>Connect with us</h2>
          <p>Join the Vite community</p>
          <ul>
            <li>
              <a href="https://github.com/vitejs/vite" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#github-icon"></use>
                </svg>
                GitHub
              </a>
            </li>
            <li>
              <a href="https://chat.vite.dev/" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#discord-icon"></use>
                </svg>
                Discord
              </a>
            </li>
            <li>
              <a href="https://x.com/vite_js" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#x-icon"></use>
                </svg>
                X.com
              </a>
            </li>
            <li>
              <a href="https://bsky.app/profile/vite.dev" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#bluesky-icon"></use>
                </svg>
                Bluesky
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}

export default App
