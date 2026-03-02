import { useReducer, useMemo } from 'react';

// Action types
const ACTIONS = {
  SET_CONTACT: 'SET_CONTACT',
  SET_TOUCHPOINTS: 'SET_TOUCHPOINTS',
  SET_ACTIVITIES: 'SET_ACTIVITIES',
  SET_NOTES: 'SET_NOTES',
  SET_METADATA: 'SET_METADATA',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_SAVING: 'SET_SAVING',

  // Tab/View state
  SET_ACTIVE_TAB: 'SET_ACTIVE_TAB',
  SET_CONTENT_VIEW: 'SET_CONTENT_VIEW',

  // Edit mode
  SET_IS_EDITING: 'SET_IS_EDITING',
  SET_EDIT_DATA: 'SET_EDIT_DATA',
  CANCEL_EDIT: 'CANCEL_EDIT',
  MARK_FIELD_DIRTY: 'MARK_FIELD_DIRTY',
  CLEAR_DIRTY_FIELDS: 'CLEAR_DIRTY_FIELDS',

  // Modal states
  TOGGLE_LOG_MODAL: 'TOGGLE_LOG_MODAL',
  TOGGLE_COPY_MODAL: 'TOGGLE_COPY_MODAL',
  TOGGLE_COLLECTIONS_MODAL: 'TOGGLE_COLLECTIONS_MODAL',
  TOGGLE_CONFLICT_MODAL: 'TOGGLE_CONFLICT_MODAL',
  TOGGLE_NOTE_MODAL: 'TOGGLE_NOTE_MODAL',
  TOGGLE_EDIT_MODAL: 'TOGGLE_EDIT_MODAL',

  // Touchpoint data
  SET_TOUCHPOINT_DATA: 'SET_TOUCHPOINT_DATA',
  RESET_TOUCHPOINT_DATA: 'RESET_TOUCHPOINT_DATA',
  SET_SELECTED_TOUCHPOINT: 'SET_SELECTED_TOUCHPOINT',
  SET_EDITING_TOUCHPOINT: 'SET_EDITING_TOUCHPOINT',
  SET_EDIT_FORM_DATA: 'SET_EDIT_FORM_DATA',

  // Note data
  SET_NOTE_FORM_DATA: 'SET_NOTE_FORM_DATA',
  RESET_NOTE_FORM_DATA: 'RESET_NOTE_FORM_DATA',

  // Misc
  SET_SELECTED_LINK_ID: 'SET_SELECTED_LINK_ID',
  SET_TOUCHPOINT_HEIGHT: 'SET_TOUCHPOINT_HEIGHT',
};

// Initial state
const initialState = {
  contact: null,
  touchpoints: [],
  activities: [],
  notes: [],
  metadata: null,
  loading: true,
  error: '',
  saving: false,

  // Tab state
  activeTab: 'contact',
  contentView: 'profile',

  // Edit mode
  isEditing: false,
  editData: {},
  dirtyFields: new Set(),

  // Modal states
  showLogModal: false,
  showCopyModal: false,
  showCollectionsModal: false,
  showConflictModal: false,
  showNoteModal: false,
  showEditModal: false,

  // Touchpoint data
  touchpointData: {
    Date: new Date().toISOString().split('T')[0],
    Type: 'Call',
    Notes: '',
    'Follow-up Needed': 'No',
    'Follow-up Date': '',
    Outcome: '',
    'Duration (min)': '',
  },
  selectedTouchpoint: null,
  editingTouchpoint: null,
  editFormData: {
    Date: '',
    Type: 'Call',
    Notes: '',
    'Follow-up Needed': 'No',
    'Follow-up Date': '',
    Outcome: '',
    'Duration (min)': '',
  },

  // Note data
  noteFormData: {
    Content: '',
    'Note Type': 'General',
    Status: 'Unprocessed',
    Tags: '',
    Visibility: 'Private',
  },

  // Misc
  selectedLinkId: null,
  touchpointHeight: null,
};

// Reducer function
function contactProfileReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_CONTACT:
      return { ...state, contact: action.payload, editData: action.payload };

    case ACTIONS.SET_TOUCHPOINTS:
      return { ...state, touchpoints: action.payload };

    case ACTIONS.SET_ACTIVITIES:
      return { ...state, activities: action.payload };

    case ACTIONS.SET_NOTES:
      return { ...state, notes: action.payload };

    case ACTIONS.SET_METADATA:
      return { ...state, metadata: action.payload };

    case ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };

    case ACTIONS.SET_ERROR:
      return { ...state, error: action.payload };

    case ACTIONS.SET_SAVING:
      return { ...state, saving: action.payload };

    case ACTIONS.SET_ACTIVE_TAB:
      return { ...state, activeTab: action.payload };

    case ACTIONS.SET_CONTENT_VIEW:
      return { ...state, contentView: action.payload };

    case ACTIONS.SET_IS_EDITING:
      return { ...state, isEditing: action.payload };

    case ACTIONS.SET_EDIT_DATA:
      return { ...state, editData: action.payload };

    case ACTIONS.CANCEL_EDIT:
      return { ...state, isEditing: false, editData: state.contact, dirtyFields: new Set() };

    case ACTIONS.MARK_FIELD_DIRTY:
      return {
        ...state,
        dirtyFields: new Set([...state.dirtyFields, action.payload]),
      };

    case ACTIONS.CLEAR_DIRTY_FIELDS:
      return { ...state, dirtyFields: new Set() };

    case ACTIONS.TOGGLE_LOG_MODAL:
      return { ...state, showLogModal: action.payload };

    case ACTIONS.TOGGLE_COPY_MODAL:
      return { ...state, showCopyModal: action.payload };

    case ACTIONS.TOGGLE_COLLECTIONS_MODAL:
      return { ...state, showCollectionsModal: action.payload };

    case ACTIONS.TOGGLE_CONFLICT_MODAL:
      return { ...state, showConflictModal: action.payload };

    case ACTIONS.TOGGLE_NOTE_MODAL:
      return { ...state, showNoteModal: action.payload };

    case ACTIONS.TOGGLE_EDIT_MODAL:
      return { ...state, showEditModal: action.payload };

    case ACTIONS.SET_TOUCHPOINT_DATA:
      return { ...state, touchpointData: action.payload };

    case ACTIONS.RESET_TOUCHPOINT_DATA:
      return {
        ...state,
        touchpointData: {
          Date: new Date().toISOString().split('T')[0],
          Type: 'Call',
          Notes: '',
          'Follow-up Needed': 'No',
          'Follow-up Date': '',
          Outcome: '',
          'Duration (min)': '',
        },
      };

    case ACTIONS.SET_SELECTED_TOUCHPOINT:
      return { ...state, selectedTouchpoint: action.payload };

    case ACTIONS.SET_EDITING_TOUCHPOINT:
      return { ...state, editingTouchpoint: action.payload };

    case ACTIONS.SET_EDIT_FORM_DATA:
      return { ...state, editFormData: action.payload };

    case ACTIONS.SET_NOTE_FORM_DATA:
      return { ...state, noteFormData: action.payload };

    case ACTIONS.RESET_NOTE_FORM_DATA:
      return {
        ...state,
        noteFormData: {
          Content: '',
          'Note Type': 'General',
          Status: 'Unprocessed',
          Tags: '',
          Visibility: 'Private',
        },
      };

    case ACTIONS.SET_SELECTED_LINK_ID:
      return { ...state, selectedLinkId: action.payload };

    case ACTIONS.SET_TOUCHPOINT_HEIGHT:
      return { ...state, touchpointHeight: action.payload };

    default:
      return state;
  }
}

/**
 * useContactProfile - Custom hook for managing ContactProfile state
 */
export function useContactProfile() {
  const [state, dispatch] = useReducer(contactProfileReducer, initialState);

  // Action creators - memoized to prevent infinite loops
  const actions = useMemo(
    () => ({
      setContact: (contact) => {
        dispatch({ type: ACTIONS.SET_CONTACT, payload: contact });
      },

      setTouchpoints: (touchpoints) => {
        dispatch({ type: ACTIONS.SET_TOUCHPOINTS, payload: touchpoints });
      },

      setActivities: (activities) => {
        dispatch({ type: ACTIONS.SET_ACTIVITIES, payload: activities });
      },

      setNotes: (notes) => {
        dispatch({ type: ACTIONS.SET_NOTES, payload: notes });
      },

      setMetadata: (metadata) => {
        dispatch({ type: ACTIONS.SET_METADATA, payload: metadata });
      },

      setLoading: (loading) => {
        dispatch({ type: ACTIONS.SET_LOADING, payload: loading });
      },

      setError: (error) => {
        dispatch({ type: ACTIONS.SET_ERROR, payload: error });
      },

      setSaving: (saving) => {
        dispatch({ type: ACTIONS.SET_SAVING, payload: saving });
      },

      setActiveTab: (tab) => {
        dispatch({ type: ACTIONS.SET_ACTIVE_TAB, payload: tab });
      },

      setContentView: (view) => {
        dispatch({ type: ACTIONS.SET_CONTENT_VIEW, payload: view });
      },

      setIsEditing: (isEditing) => {
        dispatch({ type: ACTIONS.SET_IS_EDITING, payload: isEditing });
      },

      setEditData: (data) => {
        dispatch({ type: ACTIONS.SET_EDIT_DATA, payload: data });
      },

      cancelEdit: () => {
        dispatch({ type: ACTIONS.CANCEL_EDIT });
      },

      markFieldDirty: (fieldKey) => {
        dispatch({ type: ACTIONS.MARK_FIELD_DIRTY, payload: fieldKey });
      },

      clearDirtyFields: () => {
        dispatch({ type: ACTIONS.CLEAR_DIRTY_FIELDS });
      },

      toggleLogModal: (show) => {
        dispatch({ type: ACTIONS.TOGGLE_LOG_MODAL, payload: show });
      },

      toggleCopyModal: (show) => {
        dispatch({ type: ACTIONS.TOGGLE_COPY_MODAL, payload: show });
      },

      toggleCollectionsModal: (show) => {
        dispatch({ type: ACTIONS.TOGGLE_COLLECTIONS_MODAL, payload: show });
      },

      toggleConflictModal: (show) => {
        dispatch({ type: ACTIONS.TOGGLE_CONFLICT_MODAL, payload: show });
      },

      toggleNoteModal: (show) => {
        dispatch({ type: ACTIONS.TOGGLE_NOTE_MODAL, payload: show });
      },

      toggleEditModal: (show) => {
        dispatch({ type: ACTIONS.TOGGLE_EDIT_MODAL, payload: show });
      },

      setTouchpointData: (data) => {
        dispatch({ type: ACTIONS.SET_TOUCHPOINT_DATA, payload: data });
      },

      resetTouchpointData: () => {
        dispatch({ type: ACTIONS.RESET_TOUCHPOINT_DATA });
      },

      setSelectedTouchpoint: (touchpoint) => {
        dispatch({ type: ACTIONS.SET_SELECTED_TOUCHPOINT, payload: touchpoint });
      },

      setEditingTouchpoint: (touchpoint) => {
        dispatch({ type: ACTIONS.SET_EDITING_TOUCHPOINT, payload: touchpoint });
      },

      setEditFormData: (data) => {
        dispatch({ type: ACTIONS.SET_EDIT_FORM_DATA, payload: data });
      },

      setNoteFormData: (data) => {
        dispatch({ type: ACTIONS.SET_NOTE_FORM_DATA, payload: data });
      },

      resetNoteFormData: () => {
        dispatch({ type: ACTIONS.RESET_NOTE_FORM_DATA });
      },

      setSelectedLinkId: (id) => {
        dispatch({ type: ACTIONS.SET_SELECTED_LINK_ID, payload: id });
      },

      setTouchpointHeight: (height) => {
        dispatch({ type: ACTIONS.SET_TOUCHPOINT_HEIGHT, payload: height });
      },
    }),
    []
  );

  return { state, actions };
}

export default useContactProfile;
