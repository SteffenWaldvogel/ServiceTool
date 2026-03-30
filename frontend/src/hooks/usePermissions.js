import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export function usePermissions() {
  const ctx = useContext(AuthContext);
  const user = ctx?.user;
  const permissions = ctx?.permissions;

  const can = (module, action) =>
    user?.role === 'admin' || (permissions?.includes(`${module}:${action}`) ?? false);

  return {
    can,
    canAny: (module, actions) => actions.some(a => can(module, a)),
    isAdmin: () => user?.role === 'admin',
  };
}
