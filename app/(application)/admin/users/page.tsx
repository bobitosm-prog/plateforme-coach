'use client'
import { PageHeader } from '@/app/admin/_components/PageHeader'
import { UsersTable } from '@/app/admin/users/_components/UsersTable'
import { useAdminUsers } from '@/app/admin/users/_hooks/useAdminUsers'

export default function AdminUsersPage() {
  const {
    users, loading, error,
    search, setSearch,
    roleFilter, setRoleFilter,
    updateUserLocally,
  } = useAdminUsers()

  return (
    <div className="admin-fade-in">
      <PageHeader
        title="Comptes"
        description="Gestion des utilisateurs de la plateforme MoovX"
      />
      <UsersTable
        users={users}
        loading={loading}
        error={error}
        search={search}
        onSearchChange={setSearch}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        onUserUpdated={updateUserLocally}
      />
    </div>
  )
}
