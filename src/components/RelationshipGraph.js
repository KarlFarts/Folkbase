import { useCallback, useEffect } from 'react';
import { ReactFlow, MiniMap, Controls, Background, useNodesState, useEdgesState } from 'reactflow';
import 'reactflow/dist/style.css';
import { convertToGraphData } from '../utils/devModeWrapper';
import { error as logError } from '../utils/logger';
import IconMap from './IconMap';

/**
 * Custom node component for displaying contacts in the graph (legacy)
 */
const ContactNode = ({ data }) => {
  return (
    <div
      style={{
        padding: '12px 16px',
        border: data.isPrimary ? '3px solid var(--color-accent-primary)' : '2px solid var(--color-text-primary)',
        borderRadius: '8px',
        background: data.isPrimary ? 'rgba(var(--color-accent-primary-rgb), 0.1)' : 'var(--color-bg-primary)',
        minWidth: '150px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
        e.currentTarget.style.transform = 'scale(1.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      <div className="rg-node-label">{data.label}</div>
      {data.organization && (
        <div className="rg-node-org">{data.organization}</div>
      )}
    </div>
  );
};

/**
 * Custom node component for displaying any entity type in the graph
 * Supports contacts (circles), organizations (rectangles), and locations (diamonds)
 */
const EntityNode = ({ data }) => {
  const getNodeStyle = () => {
    const baseStyle = {
      padding: '12px 16px',
      border: data.isPrimary ? `3px solid ${data.color}` : `2px solid ${data.color}`,
      background: data.isPrimary ? `${data.color}22` : 'white',
      minWidth: '150px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    };

    // Apply shape-specific styling
    if (data.nodeShape === 'circle') {
      return {
        ...baseStyle,
        borderRadius: '50px',
        minWidth: '160px',
        padding: '16px 20px',
      };
    } else if (data.nodeShape === 'diamond') {
      return {
        ...baseStyle,
        transform: 'rotate(45deg)',
        borderRadius: '8px',
        minWidth: '120px',
        minHeight: '120px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      };
    } else {
      // rectangle (default)
      return {
        ...baseStyle,
        borderRadius: '8px',
      };
    }
  };

  const getContentStyle = () => {
    // For diamond shapes, counter-rotate the content
    if (data.nodeShape === 'diamond') {
      return {
        transform: 'rotate(-45deg)',
        textAlign: 'center',
        width: '100%',
      };
    }
    return {};
  };

  return (
    <div
      style={getNodeStyle()}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
        if (data.nodeShape !== 'diamond') {
          e.currentTarget.style.transform = 'scale(1.05)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
        if (data.nodeShape !== 'diamond') {
          e.currentTarget.style.transform = 'scale(1)';
        }
      }}
    >
      <div style={getContentStyle()}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            justifyContent: data.nodeShape === 'diamond' ? 'center' : 'flex-start',
          }}
        >
          <IconMap name={data.icon} size={20} />
          <div>
            <div className="rg-node-label">{data.label}</div>
            {data.entityType && data.nodeShape !== 'diamond' && (
              <div className="rg-node-entity-type">{data.entityType}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const nodeTypes = {
  contactNode: ContactNode,
  entityNode: EntityNode,
};

/**
 * RelationshipGraph Component
 *
 * Interactive network graph visualization for entity relationships using ReactFlow.
 * Displays entities (contacts, organizations, locations) as nodes with different shapes
 * and relationships as edges with zoom, pan, and drag capabilities.
 *
 * @param {Object} props
 * @param {string} props.contactId - (Legacy) Primary contact ID for contact-only graphs
 * @param {string} props.entityType - Type of primary entity (Contact, Organization, Location)
 * @param {string} props.entityId - Primary entity ID (highlighted in graph)
 * @param {Array} props.relationships - Array of relationship objects
 * @param {Array} props.contacts - Array of contact objects (for contact-only graphs)
 * @param {Object} props.entitiesData - Map of all entities { contacts: [], organizations: [], locations: [] }
 * @param {Function} props.onNodeClick - Callback when node is clicked (entityType, entityId)
 * @param {Function} props.onEdgeClick - Callback when edge is clicked (relationshipId)
 * @param {number} props.depth - Degrees of separation to display (default: 2)
 * @param {boolean} props.isMultiEntity - True if displaying multi-entity graph (default: false)
 */
export default function RelationshipGraph({
  contactId,
  entityType,
  entityId,
  relationships,
  contacts,
  entitiesData,
  onNodeClick,
  onEdgeClick,
  depth = 2,
  isMultiEntity = false,
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (!relationships || relationships.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    let graphData;
    let primaryKey;

    if (isMultiEntity) {
      // Multi-entity mode: use convertToGraphDataMultiEntity
      if (!entitiesData) {
        setNodes([]);
        setEdges([]);
        return;
      }

      // Import and use multi-entity conversion
      import('../services/entityRelationshipService')
        .then(({ convertToGraphDataMultiEntity }) => {
          graphData = convertToGraphDataMultiEntity(
            relationships,
            entitiesData,
            entityType,
            entityId
          );
          primaryKey = `${entityType}:${entityId}`;

          // Calculate positions using a radial layout
          const positionedNodes = calculateRadialLayout(graphData.nodes, primaryKey);

          setNodes(positionedNodes);
          setEdges(graphData.edges);
        })
        .catch((error) => {
          logError('Failed to load entityRelationshipService:', error);
          // Fallback to empty state on import failure
          setNodes([]);
          setEdges([]);
        });
      return;
    } else {
      // Legacy contact-only mode
      if (!contacts) {
        setNodes([]);
        setEdges([]);
        return;
      }

      graphData = convertToGraphData(relationships, contacts, contactId);
      primaryKey = contactId;

      // Calculate positions using a radial layout
      const positionedNodes = calculateRadialLayout(graphData.nodes, primaryKey);

      setNodes(positionedNodes);
      setEdges(graphData.edges);
    }
  }, [
    contactId,
    entityType,
    entityId,
    relationships,
    contacts,
    entitiesData,
    depth,
    isMultiEntity,
    setNodes,
    setEdges,
  ]);

  const handleNodeClick = useCallback(
    (event, node) => {
      if (onNodeClick) {
        if (isMultiEntity && node.data.entityType && node.data.entityId) {
          // Multi-entity mode: pass entityType and entityId
          onNodeClick(node.data.entityType, node.data.entityId);
        } else {
          // Legacy mode: pass just the ID
          onNodeClick(node.id);
        }
      }
    },
    [onNodeClick, isMultiEntity]
  );

  const handleEdgeClick = useCallback(
    (event, edge) => {
      if (onEdgeClick) {
        onEdgeClick(edge.data?.relationshipId);
      }
    },
    [onEdgeClick]
  );

  if (!relationships || relationships.length === 0) {
    return (
      <div className="rg-empty">
        <div className="rg-empty-content">
          <p className="rg-empty-primary">No relationships yet</p>
          <p className="rg-empty-secondary">Add a relationship to see the network graph</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rg-container">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
          style: { strokeWidth: 2 },
        }}
      >
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            if (node.data.isPrimary) {
              return node.data.color || '#c2703e';
            }
            return node.data.color || '#e0d5c8';
          }}
          nodeStrokeWidth={3}
          zoomable
          pannable
        />
        <Background variant="dots" gap={12} size={1} color="#e0d5c8" />
      </ReactFlow>
    </div>
  );
}

/**
 * Calculate radial layout positions for nodes
 * Places primary contact in center, others in concentric circles
 *
 * @param {Array} nodes - Array of node objects
 * @param {string} primaryContactId - ID of central contact
 * @returns {Array} Nodes with calculated positions
 */
function calculateRadialLayout(nodes, primaryContactId) {
  if (nodes.length === 0) return [];

  const centerX = 0;
  const centerY = 0;
  const radius = 250; // Distance from center
  // const radiusStep = 200; // Distance between levels (for future multi-level layout)

  // Separate primary node from others
  const primaryNode = nodes.find((n) => n.id === primaryContactId);
  const otherNodes = nodes.filter((n) => n.id !== primaryContactId);

  const positioned = [];

  // Position primary node at center
  if (primaryNode) {
    positioned.push({
      ...primaryNode,
      position: { x: centerX, y: centerY },
    });
  }

  // Position other nodes in a circle around the center
  if (otherNodes.length > 0) {
    const angleStep = (2 * Math.PI) / otherNodes.length;

    otherNodes.forEach((node, index) => {
      const angle = index * angleStep;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      positioned.push({
        ...node,
        position: { x, y },
      });
    });
  }

  return positioned;
}
