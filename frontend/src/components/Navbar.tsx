// src/components/Navbar.tsx
import { Link, useLocation } from 'react-router-dom'; // Import these
import {
  IconFileSearch,
  IconHome,
  IconFileUpload,
  IconCloudNetwork,
} from '@tabler/icons-react';
import { Code, Group, NavLink } from '@mantine/core';
import classes from './Navbar.module.css';

const data = [
  { path: '/', label: 'Home', icon: IconHome },
  { path: '/browse', label: 'Browse Documents', icon: IconFileSearch },
  { path: '/upload', label: 'Upload File(s)', icon: IconFileUpload },
  { path: '/cloudwatch-logs', label: 'CloudWatch Logs', icon: IconCloudNetwork },
];

export function Navbar() {
  const location = useLocation(); // Get current route path

  const links = data.map((item) => (
    <NavLink
      key={item.label}
      label={item.label}
      leftSection={<item.icon size={20} stroke={1.5} />}
      // Use Link as the component for navigation
      component={Link}
      to={item.path}
      // Highlight active link based on current URL
      active={location.pathname === item.path}
      classNames={{
        root: classes.link,
      }}
    />
  ));

  return (
    <>
      <Group className={classes.header} justify="space-between" mb="md">
        <Code fw={700}>v0.0.1</Code>
      </Group>

      {links}
    </>
  );
}