import {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  useEffect,
} from 'react';
import * as monitorsRepository from '../services/repositories/monitorsRepository';
import * as alertsRepository from '../services/repositories/alertsRepository';
import * as validationRulesRepository from '../services/repositories/validationRulesRepository';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [authed, setAuthed] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [monitors, setMonitors] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [validationRules, setValidationRules] = useState([]);

  const refreshWorkspace = useCallback(async () => {
    setLoadError(null);
    try {
      const [m, a, v] = await Promise.all([
        monitorsRepository.listMonitors(),
        alertsRepository.listAlerts(),
        validationRulesRepository.listValidationRules(),
      ]);
      setMonitors(m);
      setAlerts(a);
      setValidationRules(v);
    } catch (e) {
      console.error(e);
      setLoadError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setDataReady(true);
    }
  }, []);

  useEffect(() => {
    refreshWorkspace();
  }, [refreshWorkspace]);

  const signIn = useCallback(() => setAuthed(true), []);
  const signOut = useCallback(() => setAuthed(false), []);

  const addMonitor = useCallback(
    async (monitor) => {
      await monitorsRepository.createMonitor(monitor);
      await refreshWorkspace();
    },
    [refreshWorkspace]
  );

  const updateMonitorStatus = useCallback(
    async (id, status) => {
      await monitorsRepository.updateMonitorStatus(id, status);
      await refreshWorkspace();
    },
    [refreshWorkspace]
  );

  const resolveAlert = useCallback(
    async (alertId) => {
      await alertsRepository.resolveAlert(alertId);
      await refreshWorkspace();
    },
    [refreshWorkspace]
  );

  const addValidationRule = useCallback(
    async (monitorId, rule) => {
      await validationRulesRepository.addValidationRule(monitorId, rule);
      await refreshWorkspace();
    },
    [refreshWorkspace]
  );

  const value = useMemo(
    () => ({
      authed,
      signIn,
      signOut,
      dataReady,
      loadError,
      refreshWorkspace,
      monitors,
      addMonitor,
      updateMonitorStatus,
      alerts,
      resolveAlert,
      validationRules,
      addValidationRule,
    }),
    [
      authed,
      signIn,
      signOut,
      dataReady,
      loadError,
      refreshWorkspace,
      monitors,
      addMonitor,
      updateMonitorStatus,
      alerts,
      resolveAlert,
      validationRules,
      addValidationRule,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp requires AppProvider');
  return ctx;
}
