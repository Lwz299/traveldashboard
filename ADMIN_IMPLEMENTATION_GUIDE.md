# Admin Dashboard Refactored - Quick Start Guide

## For Developers: How to Use the New Architecture

### 1. Creating a New Admin Page

**Step 1: Import the hooks and services you need**
```jsx
import { useAdminOrganizations } from '../features/admin/hooks'
import { organizationService } from '../features/admin/services/organizationService'
import { AdminExpandableCard, LoadingSkeletons, ErrorState } from '../features/admin/components'
```

**Step 2: Get your data with the hook**
```jsx
function MyAdminPage() {
  const { data, loading, error, refetch } = useAdminOrganizations()
```

**Step 3: Render with standard patterns**
```jsx
  if (loading) return <LoadingSkeletons />
  if (error) return <ErrorState message={error} onRetry={() => refetch()} />
  
  return (
    <div>
      {data?.map(item => (
        <ItemComponent key={item.id} item={item} onRefresh={() => refetch(true)} />
      ))}
    </div>
  )
}
```

### 2. Using Services for API Calls

**Always use services instead of direct api.get/api.post calls:**

```jsx
// ❌ Don't do this anymore
import api from '../../api/api'
const { data } = await api.get('/organizations/1')

// ✅ Do this instead
import { organizationService } from '../services/organizationService'
const org = await organizationService.getOrganizationAccounts(orgId)
```

**Benefits:**
- Response normalization happens automatically
- Consistent error handling
- Easy to extend or modify endpoints
- Single source of truth

### 3. Using Custom Hooks

**Generic hooks for common patterns:**

```jsx
// Data fetching with loading/error
const { data, loading, error, refetch } = useFetch(
  () => organizationService.fetchOrganizations()
)

// Form state management
const { values, handleChange, handleSubmit, errors } = useForm(
  { name: '', email: '' },
  async (formData) => {
    await organizationService.updateOrganization(id, formData)
  }
)

// List filtering
const { filtered, filters, updateFilter, hasActiveFilters, resetFilters } = 
  useAdminListFilters(organizations, [
    org => org.name,
    org => org.email,
    org => org.description,
  ])
```

### 4. Building Reusable Components

**Extract UI into composable pieces:**

```jsx
// Keep page simple by extracting items as components
function AdminPage() {
  const { data, refetch } = useAdminOrganizations()
  
  return data?.map(org => (
    <OrganizationItemCard 
      key={org.id} 
      org={org} 
      onUpdate={() => refetch(true)} 
    />
  ))
}

// ItemCard handles all its own logic
function OrganizationItemCard({ org, onUpdate }) {
  const [editing, setEditing] = useState(false)
  
  const handleSave = async (formData) => {
    await organizationService.updateOrganization(org.id, formData)
    setEditing(false)
    onUpdate()
  }
  
  return (
    <AdminExpandableCard>
      {editing ? (
        <EditForm onSave={handleSave} />
      ) : (
        <ViewMode onEdit={() => setEditing(true)} />
      )}
    </AdminExpandableCard>
  )
}
```

### 5. Adding New Admin Features

**Create a new service file for a feature:**
```jsx
// src/features/admin/services/myFeatureService.js
export const myFeatureService = {
  fetchItems: async () => {
    const { data } = await api.get('/my-endpoint')
    return normalizeArrayResponse(data)
  },
  
  createItem: async (itemData) => {
    const { data } = await api.post('/my-endpoint', itemData)
    return data
  },
  
  updateItem: async (id, itemData) => {
    const { data } = await api.put(`/my-endpoint/${id}`, itemData)
    return data
  },
  
  deleteItem: async (id) => {
    const { data } = await api.delete(`/my-endpoint/${id}`)
    return data
  },
}
```

**Create a hook for it:**
```jsx
// src/features/admin/hooks/useAdmin.js
export function useMyFeature() {
  return useFetch(myFeatureService.fetchItems)
}
```

**Use it in your page:**
```jsx
import { useMyFeature } from '../hooks'

function MyFeaturePage() {
  const { data, loading, error, refetch } = useMyFeature()
  // ... rest of page
}
```

## Common Patterns

### Modal/Dialog Management
```jsx
import { useAdminModal } from '../hooks'

function MyPage() {
  const { modal, open, close, isOpen } = useAdminModal()
  
  return (
    <>
      <Button onClick={() => open('create')}>Create</Button>
      {isOpen('create') && (
        <CreateDialog onClose={close} />
      )}
    </>
  )
}
```

### List Filtering
```jsx
import { useAdminListFilters } from '../hooks'

function ItemsPage() {
  const { data } = useAdminItems()
  const {
    filtered,
    filters,
    updateFilter,
    resetFilters,
    hasActiveFilters,
  } = useAdminListFilters(data, [
    item => item.name,
    item => item.description,
  ])
  
  return (
    <>
      <Input
        value={filters.search}
        onChange={(e) => updateFilter('search', e.target.value)}
        placeholder="Search..."
      />
      <select
        value={filters.status}
        onChange={(e) => updateFilter('status', e.target.value)}
      >
        <option value="all">All Status</option>
        <option value="Active">Active</option>
        <option value="Inactive">Inactive</option>
      </select>
      {hasActiveFilters && (
        <Button onClick={resetFilters}>Clear Filters</Button>
      )}
      
      {filtered?.map(item => <ItemRow key={item.id} item={item} />)}
    </>
  )
}
```

### Error Handling & Retry
```jsx
function MyComponent() {
  const { data, error, refetch } = useAdminOrganizations()
  
  if (error) {
    return (
      <ErrorState
        title="فشل التحميل"
        message={error}
        action={<Button onClick={() => refetch()}>إعادة محاولة</Button>}
      />
    )
  }
}
```

## Key Files to Know

- **Services**: `src/features/admin/services/*.js` - API wrappers
- **Hooks**: `src/features/admin/hooks/*.js` - State management
- **Components**: `src/features/admin/components/*.jsx` - UI building blocks
- **Constants**: `src/features/admin/constants/index.js` - Shared config
- **Utils**: `src/features/admin/utils/index.js` - Helper functions

## Typical Admin Page Structure

```jsx
src/
└── pages/admin/
    ├── AdminDashboard.refactored.jsx
    ├── AdminOrganizations.refactored.jsx
    ├── AdminPayouts.refactored.jsx
    └── ... more admin pages
```

Each page should:
1. Use hooks to fetch data
2. Split large components into smaller ones
3. Use component library for UI
4. Handle loading/error/empty states
5. Keep business logic in hooks/services

## Migration Checklist

When converting an old admin page to new pattern:

- [ ] Identify all API calls → create/use service methods
- [ ] Identify all state management → create/use hooks
- [ ] Extract item rows into sub-components
- [ ] Use AdminExpandableCard, AdminDataTable, etc.
- [ ] Use LoadingSkeletons, ErrorState components
- [ ] Remove inline Tailwind → use component library
- [ ] Test all functionality
- [ ] Update imports in router if needed
