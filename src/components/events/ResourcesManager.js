import { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import WindowTemplate from '../WindowTemplate';
import {
  getEventResources,
  addEventResource,
  updateEventResource,
  deleteEventResource,
} from '../../utils/devModeWrapper';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useActiveSheetId } from '../../utils/sheetResolver';

const RESOURCE_TYPES = ['Material', 'Equipment', 'Venue', 'Catering', 'Transportation', 'Other'];

/**
 * ResourcesManager - Manage event resources (junction table)
 */
function ResourcesManager({ eventId }) {
  const { accessToken } = useAuth();
  const { showNotification } = useNotification();
  const activeSheetId = useActiveSheetId();

  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    'Resource Type': '',
    'Item Name': '',
    Quantity: '',
    'Cost Per Unit': '',
    'Total Cost': '',
    'Provider/Source': '',
    Notes: '',
  });

  useEffect(() => {
    loadResources();
  }, [eventId]);

  const loadResources = async () => {
    if (!accessToken || !activeSheetId || !eventId) return;

    try {
      setLoading(true);
      const data = await getEventResources(accessToken, activeSheetId, eventId);
      setResources(data);
    } catch (error) {
      showNotification('Failed to load resources', 'error');
      console.error('Error loading resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      'Resource Type': '',
      'Item Name': '',
      Quantity: '',
      'Cost Per Unit': '',
      'Total Cost': '',
      'Provider/Source': '',
      Notes: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (resource) => {
    setEditingId(resource['Resource ID']);
    setFormData({
      'Resource Type': resource['Resource Type'] || '',
      'Item Name': resource['Item Name'] || '',
      Quantity: resource.Quantity || '',
      'Cost Per Unit': resource['Cost Per Unit'] || '',
      'Total Cost': resource['Total Cost'] || '',
      'Provider/Source': resource['Provider/Source'] || '',
      Notes: resource.Notes || '',
    });
    setIsModalOpen(true);
  };

  const calculateTotalCost = () => {
    const quantity = parseFloat(formData.Quantity) || 0;
    const costPerUnit = parseFloat(formData['Cost Per Unit']) || 0;
    const total = quantity * costPerUnit;
    return total > 0 ? total.toFixed(2) : '';
  };

  const handleSave = async () => {
    if (!formData['Resource Type']) {
      showNotification('Resource Type is required', 'error');
      return;
    }

    try {
      const totalCost = formData['Total Cost'] || calculateTotalCost();

      const saveData = {
        'Event ID': eventId,
        'Resource Type': formData['Resource Type'],
        'Item Name': formData['Item Name'],
        Quantity: formData.Quantity,
        'Cost Per Unit': formData['Cost Per Unit'],
        'Total Cost': totalCost,
        'Provider/Source': formData['Provider/Source'],
        Notes: formData.Notes,
      };

      if (editingId) {
        await updateEventResource(accessToken, activeSheetId, editingId, saveData);
        showNotification('Resource updated', 'success');
      } else {
        await addEventResource(accessToken, activeSheetId, saveData);
        showNotification('Resource added', 'success');
      }

      setIsModalOpen(false);
      loadResources();
    } catch (error) {
      showNotification('Failed to save resource', 'error');
      console.error('Error saving resource:', error);
    }
  };

  const handleDelete = async (resourceId) => {
    if (!confirm('Delete this resource?')) return;

    try {
      await deleteEventResource(accessToken, activeSheetId, resourceId);
      showNotification('Resource deleted', 'success');
      loadResources();
    } catch (error) {
      showNotification('Failed to delete resource', 'error');
      console.error('Error deleting resource:', error);
    }
  };

  if (loading) {
    return <p className="text-muted">Loading resources...</p>;
  }

  const totalBudget = resources.reduce((sum, r) => {
    const cost = parseFloat(r['Total Cost']) || 0;
    return sum + cost;
  }, 0);

  return (
    <div>
      <div className="resm-header">
        <div>
          <h3>Resources & Budget</h3>
          {totalBudget > 0 && (
            <p className="text-muted resm-total-budget">
              Total: ${totalBudget.toFixed(2)}
            </p>
          )}
        </div>
        <button onClick={openAddModal} className="btn btn-primary btn-sm">
          <Plus size={16} /> Add Resource
        </button>
      </div>

      {resources.length === 0 ? (
        <p className="text-muted">No resources yet. Click "Add Resource" to get started.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Item</th>
              <th>Quantity</th>
              <th>Cost/Unit</th>
              <th>Total</th>
              <th>Provider</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {resources.map((resource) => (
              <tr key={resource['Resource ID']}>
                <td>{resource['Resource Type']}</td>
                <td>{resource['Item Name'] || <span className="text-muted">—</span>}</td>
                <td>{resource.Quantity || <span className="text-muted">—</span>}</td>
                <td>
                  {resource['Cost Per Unit'] ? (
                    `$${resource['Cost Per Unit']}`
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td>
                  {resource['Total Cost'] ? (
                    <strong>${resource['Total Cost']}</strong>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td>{resource['Provider/Source'] || <span className="text-muted">—</span>}</td>
                <td>
                  <div className="resm-actions">
                    <button
                      onClick={() => openEditModal(resource)}
                      className="btn btn-ghost btn-sm"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(resource['Resource ID'])}
                      className="btn btn-ghost btn-sm"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {isModalOpen && (
        <WindowTemplate
          title={editingId ? 'Edit Resource' : 'Add Resource'}
          onClose={() => setIsModalOpen(false)}
          actions={[
            { label: 'Cancel', onClick: () => setIsModalOpen(false) },
            { label: 'Save', onClick: handleSave, variant: 'primary' },
          ]}
        >
          <div className="resm-form">
            <div>
              <label className="form-label">
                Resource Type <span className="resm-required">*</span>
              </label>
              <select
                className="form-select"
                value={formData['Resource Type']}
                onChange={(e) => setFormData({ ...formData, 'Resource Type': e.target.value })}
              >
                <option value="">Select type...</option>
                {RESOURCE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Item Name</label>
              <input
                type="text"
                className="form-input"
                value={formData['Item Name']}
                onChange={(e) => setFormData({ ...formData, 'Item Name': e.target.value })}
                placeholder="Chair, Microphone, Catering, etc."
              />
            </div>

            <div className="resm-cost-grid">
              <div>
                <label className="form-label">Quantity</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.Quantity}
                  onChange={(e) => setFormData({ ...formData, Quantity: e.target.value })}
                  placeholder="10"
                />
              </div>

              <div>
                <label className="form-label">Cost Per Unit ($)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={formData['Cost Per Unit']}
                  onChange={(e) => setFormData({ ...formData, 'Cost Per Unit': e.target.value })}
                  placeholder="25.00"
                />
              </div>
            </div>

            <div>
              <label className="form-label">Total Cost ($)</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                value={formData['Total Cost']}
                onChange={(e) => setFormData({ ...formData, 'Total Cost': e.target.value })}
                placeholder={calculateTotalCost() || 'Auto-calculated from quantity × cost/unit'}
              />
              {calculateTotalCost() && (
                <small className="text-muted">Calculated: ${calculateTotalCost()}</small>
              )}
            </div>

            <div>
              <label className="form-label">Provider/Source</label>
              <input
                type="text"
                className="form-input"
                value={formData['Provider/Source']}
                onChange={(e) => setFormData({ ...formData, 'Provider/Source': e.target.value })}
                placeholder="Company or vendor name"
              />
            </div>

            <div>
              <label className="form-label">Notes</label>
              <textarea
                className="form-textarea"
                value={formData.Notes}
                onChange={(e) => setFormData({ ...formData, Notes: e.target.value })}
                rows={2}
                placeholder="Additional notes..."
              />
            </div>
          </div>
        </WindowTemplate>
      )}
    </div>
  );
}

export default ResourcesManager;
