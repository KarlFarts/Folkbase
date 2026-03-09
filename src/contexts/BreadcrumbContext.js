import { createContext, useContext, useState } from 'react';

const noop = () => {};
const defaultValue = { entityName: null, setEntityName: noop };

const BreadcrumbContext = createContext(defaultValue);

export function BreadcrumbProvider({ children }) {
  const [entityName, setEntityName] = useState(null);
  return (
    <BreadcrumbContext.Provider value={{ entityName, setEntityName }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumb() {
  return useContext(BreadcrumbContext);
}
