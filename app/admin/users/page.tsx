'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Stack,
  Group,
  Button,
  Table,
  Badge,
  Text,
  Modal,
  TextInput,
  Select,
  Paper,
  ActionIcon,
  LoadingOverlay,
  Alert,
  Switch,
} from '@mantine/core';
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconUser,
  IconMail,
  IconPhone,
  IconAlertCircle,
  IconCheck,
  IconX,
  IconShield,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { createClient } from '@/lib/supabase/client';

interface User {
  id: string;
  user_id: string;
  role: string;
  name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpened, setModalOpened] = useState(false);
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<string>('ground_manager');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/admin/users');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch users');
      }

      setUsers(result.users || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      notifications.show({
        title: '❌ Error',
        message: error.message || 'Failed to load users',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!name || !email || !password) {
      notifications.show({
        title: '⚠️ Missing Fields',
        message: 'Name, email, and password are required',
        color: 'orange',
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          password,
          role,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create user');
      }

      notifications.show({
        title: '✅ User Created',
        message: `${name} has been added successfully`,
        color: 'green',
        icon: <IconCheck size={18} />,
      });

      setModalOpened(false);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      notifications.show({
        title: '❌ Creation Failed',
        message: error.message,
        color: 'red',
        icon: <IconX size={18} />,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          is_active: !currentStatus,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update user');
      }

      notifications.show({
        title: '✅ Status Updated',
        message: result.message || `User ${!currentStatus ? 'activated' : 'deactivated'}`,
        color: 'green',
      });

      fetchUsers();
    } catch (error: any) {
      notifications.show({
        title: '❌ Update Failed',
        message: error.message || 'Failed to update user status',
        color: 'red',
      });
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete ${userName}?\n\nThis will also delete their auth account.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete user');
      }

      notifications.show({
        title: '✅ User Deleted',
        message: `${userName} has been removed`,
        color: 'green',
        icon: <IconTrash size={18} />,
      });

      fetchUsers();
    } catch (error: any) {
      notifications.show({
        title: '❌ Delete Failed',
        message: error.message,
        color: 'red',
      });
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setPhone(user.phone || '');
    setEditModalOpened(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser || !name || !email) {
      notifications.show({
        title: '⚠️ Missing Fields',
        message: 'Name and email are required',
        color: 'orange',
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/admin/users/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingUser.id,
          name,
          email,
          phone,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update user');
      }

      notifications.show({
        title: '✅ User Updated',
        message: `${name}'s details have been updated`,
        color: 'green',
        icon: <IconCheck size={18} />,
      });

      setEditModalOpened(false);
      resetForm();
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      notifications.show({
        title: '❌ Update Failed',
        message: error.message,
        color: 'red',
        icon: <IconX size={18} />,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setRole('ground_manager');
  };

  const getRoleBadgeColor = (role: string) => {
    return role === 'admin' ? 'red' : 'blue';
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Title order={1}>User Management</Title>
            <Text size="sm" c="dimmed" mt="xs">
              Manage ground managers and their access
            </Text>
          </div>

          <Button
            leftSection={<IconPlus size={18} />}
            onClick={() => setModalOpened(true)}
          >
            Add User
          </Button>
        </Group>

        {/* Alert */}
        <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
          <Text size="sm">
            <strong>Admin:</strong> Full access to all features.{' '}
            <strong>Ground Manager:</strong> Can view bookings and add remaining payments only.
          </Text>
        </Alert>

        {/* Users Table */}
        <Paper shadow="sm" p="md" withBorder>
          <LoadingOverlay visible={loading} />
          
          <Table.ScrollContainer minWidth={800}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Phone</Table.Th>
                  <Table.Th>Role</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Created</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {users.map((user) => (
                  <Table.Tr key={user.id}>
                    <Table.Td>
                      <Group gap="xs">
                        <IconUser size={16} />
                        <Text fw={500}>{user.name}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{user.email}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{user.phone || '-'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={getRoleBadgeColor(user.role)} variant="light">
                        {user.role === 'admin' ? '🛡️ Admin' : '👤 Ground Manager'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Switch
                        checked={user.is_active}
                        onChange={() => handleToggleActive(user.id, user.is_active)}
                        disabled={user.role === 'admin'}
                        size="sm"
                      />
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed">
                        {new Date(user.created_at).toLocaleDateString()}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        {user.role !== 'admin' && (
                          <>
                            <ActionIcon
                              color="blue"
                              variant="light"
                              onClick={() => openEditModal(user)}
                            >
                              <IconEdit size={16} />
                            </ActionIcon>
                            <ActionIcon
                              color="red"
                              variant="light"
                              onClick={() => handleDeleteUser(user.id, user.name)}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>

          {users.length === 0 && !loading && (
            <Text ta="center" c="dimmed" py="xl">
              No users found. Add your first ground manager!
            </Text>
          )}
        </Paper>
      </Stack>

      {/* Create User Modal */}
      <Modal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          resetForm();
        }}
        title="Add New User"
        size="md"
        centered
        zIndex={300}
      >
        <Stack gap="md">
          <TextInput
            label="Full Name"
            placeholder="Enter full name"
            leftSection={<IconUser size={16} />}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <TextInput
            label="Email"
            placeholder="user@example.com"
            leftSection={<IconMail size={16} />}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <TextInput
            label="Phone"
            placeholder="03XXXXXXXXX"
            leftSection={<IconPhone size={16} />}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <TextInput
            label="Password"
            placeholder="Enter password (min 6 characters)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Select
            label="Role"
            placeholder="Select role"
            leftSection={<IconShield size={16} />}
            data={[
              { value: 'ground_manager', label: '👤 Ground Manager' },
              { value: 'admin', label: '🛡️ Admin' },
            ]}
            value={role}
            onChange={(val) => setRole(val || 'ground_manager')}
            required
          />

          <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
            <Text size="xs">
              Ground Managers can only view bookings and add remaining payments. They cannot edit or delete bookings.
            </Text>
          </Alert>

          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => {
              setModalOpened(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateUser}
              loading={submitting}
              leftSection={<IconCheck size={18} />}
            >
              Create User
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        opened={editModalOpened}
        onClose={() => {
          setEditModalOpened(false);
          resetForm();
          setEditingUser(null);
        }}
        title="Edit User Details"
        size="md"
        centered
        zIndex={300}
      >
        <Stack gap="md">
          <TextInput
            label="Full Name"
            placeholder="Enter full name"
            leftSection={<IconUser size={16} />}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <TextInput
            label="Email"
            placeholder="user@example.com"
            leftSection={<IconMail size={16} />}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <TextInput
            label="Phone"
            placeholder="03XXXXXXXXX"
            leftSection={<IconPhone size={16} />}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <Alert icon={<IconAlertCircle size={16} />} color="yellow" variant="light">
            <Text size="xs">
              Only name, email, and phone can be edited. To change role or password, delete and recreate the user.
            </Text>
          </Alert>

          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => {
              setEditModalOpened(false);
              resetForm();
              setEditingUser(null);
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateUser}
              loading={submitting}
              leftSection={<IconCheck size={18} />}
            >
              Update User
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
