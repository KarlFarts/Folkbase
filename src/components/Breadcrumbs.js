import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSheetId } from '../utils/sheetResolver';
import { readSheetData, SHEETS } from '../utils/devModeWrapper';

function Breadcrumbs() {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeWorkspace } = useWorkspace();
  const { accessToken } = useAuth();
  const sheetId = useActiveSheetId();

  // State for dynamic entity names (contacts, events)
  const [entityName, setEntityName] = useState(null);

  // Extract entity ID from URL for contact or event profile pages
  const getEntityInfo = useCallback(() => {
    const pathname = location.pathname;
    const contactMatch = pathname.match(/^\/contacts\/([^/]+)$/);
    const eventMatch = pathname.match(/^\/events\/([^/]+)$/);

    if (contactMatch && contactMatch[1] !== 'add') {
      return { type: 'contact', id: contactMatch[1] };
    }
    if (eventMatch && eventMatch[1] !== 'add') {
      return { type: 'event', id: eventMatch[1] };
    }
    return null;
  }, [location.pathname]);

  // Fetch entity name when on a profile page
  useEffect(() => {
    const entityInfo = getEntityInfo();

    const fetchEntityName = async () => {
      if (!entityInfo || !accessToken || !sheetId) {
        setEntityName(null);
        return;
      }

      try {
        if (entityInfo.type === 'contact') {
          const result = await readSheetData(accessToken, sheetId, SHEETS.CONTACTS);
          const contact = result.data.find((c) => c['Contact ID'] === entityInfo.id);
          setEntityName(contact?.Name || null);
        } else if (entityInfo.type === 'event') {
          const result = await readSheetData(accessToken, sheetId, SHEETS.EVENTS);
          const event = result.data.find((e) => e['Event ID'] === entityInfo.id);
          setEntityName(event?.Name || event?.Title || null);
        }
      } catch {
        setEntityName(null);
      }
    };

    fetchEntityName();
  }, [location.pathname, accessToken, sheetId, getEntityInfo]);

  // Generate breadcrumbs from route
  const generateBreadcrumbs = () => {
    const pathname = location.pathname;
    const parts = pathname.split('/').filter(Boolean);

    const breadcrumbs = [];

    // Step 1: Add context root (Personal or Workspace)
    if (activeWorkspace) {
      breadcrumbs.push({
        label: `Workspace: ${activeWorkspace.name}`,
        path: `/workspaces/${activeWorkspace.id}`,
      });
    } else {
      breadcrumbs.push({
        label: 'Personal',
        path: '/',
      });
    }

    // Step 2: Map route segments to breadcrumbs
    let currentPath = '';
    const entityInfo = getEntityInfo();

    parts.forEach((part) => {
      currentPath += `/${part}`;

      // Skip IDs (they'll be replaced with names), 'add', and 'workspaces' when in workspace context
      if (part.match(/^[a-f0-9-]{20,}$/i) || part === 'add') {
        return;
      }

      // Skip 'workspaces' segment when already showing workspace in root
      if (part === 'workspaces' && activeWorkspace) {
        return;
      }

      const labelMap = {
        contacts: 'Contacts',
        touchpoints: 'Touchpoints',
        events: 'Events',
        import: 'Import',
        export: 'Export',
        workspaces: 'Workspaces',
        create: 'Create Workspace',
        join: 'Join Workspace',
        templates: 'Templates',
      };

      if (labelMap[part]) {
        breadcrumbs.push({
          label: labelMap[part],
          path: currentPath,
        });
      }
    });

    // Step 3: Add entity name as final breadcrumb
    if (entityInfo && entityName) {
      breadcrumbs.push({
        label: entityName,
        path: pathname, // Current page, non-clickable (will be styled differently)
      });
    }

    // Don't show breadcrumbs on home page
    if (breadcrumbs.length === 1 && pathname === '/') {
      return [];
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  if (breadcrumbs.length === 0) {
    return null;
  }

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol className="breadcrumbs-list">
        {breadcrumbs.map((breadcrumb, index) => (
          <li key={breadcrumb.path} className="breadcrumbs-item">
            <button
              className="breadcrumbs-link"
              onClick={() => navigate(breadcrumb.path)}
              aria-current={index === breadcrumbs.length - 1 ? 'page' : undefined}
            >
              {breadcrumb.label}
            </button>
            {index < breadcrumbs.length - 1 && <span className="breadcrumbs-separator">/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default Breadcrumbs;
