# Admin Dashboard Refactoring Guide

## Architecture Overview

### New Structure: Feature-Based Organization

```
src/
├── features/
│   └── admin/
│       ├── components/        # Reusable admin components
│       ├── constants/         # Status maps, nav items, routes
│       ├── hooks/             # Custom data-fetching hooks
│       ├── services/          # API service layer
│       └── utils/             # Helper functions
├── pages/
│   └── admin/                 # Page components (refactored)
└── api/                       # Low-level API clients (unchanged)
```

## Key Changes

### 1. Services Layer (`src/features/admin/services/`)
- **Purpose**: Centralize all API calls related to admin functionality
- **Benefits**:
  - Single source of truth for API endpoints
  - Easy to mock for testing
  - Consistent error handling
  - Response normalization

**Services Created**:
- `dashboardService.js` - Dashboard data, reports, summaries
- `eventService.js` - Event CRUD and performance tracking
- `organizationService.js` - Organization management
- `financeService.js` - Financial data and payouts
- `supportService.js` - Support tickets and communication

### 2. Custom Hooks (`src/features/admin/hooks/`)
- **Purpose**: Abstract data fetching and state management
- **Benefits**:
  - Reusable across pages
  - Consistent loading/error handling
  - Easy to test logic separately from components

**Hooks Created**:
- `useFetch()` - Generic data fetching with loading/error states
- `useForm()` - Form state management
- `usePaginatedList()` - Pagination and filtering
- `useCrud()` - CRUD operations management
- Specialized hooks like `useAdminOrganizations()`, `useAdminEvents()`, etc.

### 3. Reusable Components (`src/features/admin/components/`)
- **Purpose**: Common UI patterns for admin pages
- **Benefits**:
  - Consistent styling and behavior
  - Reduced code duplication
  - Easier to maintain and update

**Components Created**:
- `AdminTable` - Versatile table with sorting and pagination
- `AdminExpandableCard` - Collapsible card for list items
- `ConfirmDialog` - Reusable confirmation dialogs
- `EmptyState` - Standardized empty state display
- `ErrorState` - Standardized error display
- `LoadingSkeletons` - Loading indicators

### 4. Constants & Utils (`src/features/admin/constants/` & `src/features/admin/utils/`)
- **Purpose**: Share configuration and helper functions
- **Benefits**:
  - Single source for status labels/colors
  - Consistent API response handling
  - Reduced inline logic

**Exports**:
- Status mappings and colors
- Navigation items
- Route titles
- Safe property accessors
- Response normalization utilities

## Migration Path

### Before Refactoring (Old Pattern)
```jsx
function AdminOrganizations() {
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    setLoading(true)
    api.get("/super-admin/organizations")
      .then(({ data }) => {
        setOrganizations(Array.isArray(data) ? data : data?.items ?? [])
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (id, data) => {
    try {
      await api.put(`/organizations/${id}`, data)
      // refetch...
    } catch (err) {
      // error handling...
    }
  }
  
  return (
    // complex JSX with inline logic
  )
}
```

### After Refactoring (New Pattern)
```jsx
function AdminOrganizationsPage() {
  const { data: organizations, loading, error, refetch } = useAdminOrganizations()

  return (
    <div>
      {loading && <LoadingSkeletons />}
      {error && <ErrorState onRetry={() => refetch()} />}
      {organizations?.map(org => (
        <OrganizationItem 
          organization={org} 
          onRefresh={() => refetch(true)} 
        />
      ))}
    </div>
  )
}

function OrganizationItem({ organization, onRefresh }) {
  const [editing, setEditing] = useState(false)
  const handleSave = async (formData) => {
    await organizationService.updateOrganization(organization.id, formData)
    onRefresh()
  }
  return (
    <AdminExpandableCard>
      {editing ? (
        <OrganizationEditForm onSave={handleSave} />
      ) : (
        <div>{/* content */}</div>
      )}
    </AdminExpandableCard>
  )
}
```

## Usage Examples

### Using Services
```jsx
import { organizationService } from '../services/organizationService'

// Fetch organizations
const orgs = await organizationService.fetchOrganizations()

// Update organization
await organizationService.updateOrganization(orgId, {
  name: "New Name",
  email: "new@email.com"
})
```

### Using Hooks
```jsx
import { useAdminOrganizations } from '../hooks'

function MyComponent() {
  const { data, loading, error, refetch } = useAdminOrganizations()
  
  return (
    <>
      {loading && <LoadingSkeletons />}
      {error && <ErrorState message={error} />}
      {data?.map(item => <Item key={item.id} {...item} />)}
    </>
  )
}
```

### Using Components
```jsx
import { AdminExpandableCard, ErrorState, LoadingSkeletons } from '../components'

<AdminExpandableCard
  icon={Building2}
  title="Organization Name"
  subtitle="email@example.com"
  status={{ label: "Active", className: "bg-green-50 text-green-700" }}
  expanded={isExpanded}
  onToggle={() => setExpanded(!isExpanded)}
>
  {/* content inside expanded area */}
</AdminExpandableCard>
```

## Benefits Summary

1. **Separation of Concerns**
   - Components handle UI
   - Services handle API
   - Hooks handle state logic

2. **Reusability**
   - Share services across pages
   - Share hooks across components
   - Share UI components

3. **Maintainability**
   - Smaller, focused files
   - Clear responsibility
   - Easy to locate and modify

4. **Testability**
   - Mock services easily
   - Test hooks independently
   - Test components with mock data

5. **Scalability**
   - Easy to add new pages
   - Consistent patterns
   - Clear structure

## Migration Checklist

- [x] Create feature folder structure
- [x] Create service layer
- [x] Create custom hooks
- [x] Create reusable components
- [x] Create constants and utilities
- [ ] Refactor AdminDashboard
- [ ] Refactor AdminEvents
- [ ] Refactor AdminOrganizations
- [ ] Refactor AdminFinance
- [ ] Refactor AdminSupportTickets
- [ ] Update remaining admin pages
- [ ] Remove old code
- [ ] Test all pages
- [ ] Update imports in routes
