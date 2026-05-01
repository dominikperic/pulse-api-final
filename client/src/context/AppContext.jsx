import {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  useEffect,
} from 'react';
import * as contractsRepository from '../services/repositories/contractsRepository';
import * as alertsRepository from '../services/repositories/alertsRepository';
import * as validationRulesRepository from '../services/repositories/validationRulesRepository';
import * as authRepository from '../services/repositories/authRepository';
import { mergeRequestConfig } from '../lib/requestConfigDefaults.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [authed, setAuthed] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [authReady] = useState(true);
  const [dataReady, setDataReady] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [validationRules, setValidationRules] = useState([]);

  const refreshWorkspace = useCallback(async () => {
    setLoadError(null);
    try {
      const [c, a, v] = await Promise.all([
        contractsRepository.listContracts(),
        alertsRepository.listAlerts(),
        validationRulesRepository.listValidationRules(),
      ]);
      setContracts(c);
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

  const signIn = useCallback(
    async (credentials) => {
      const { user } = await authRepository.signIn(credentials);
      setAuthUser(user || null);
      setAuthed(Boolean(user));
      await refreshWorkspace();
      return user;
    },
    [refreshWorkspace]
  );

  const signUp = useCallback(
    async (payload) => {
      const { user } = await authRepository.signUp(payload);
      setAuthUser(user || null);
      setAuthed(Boolean(user));
      await refreshWorkspace();
      return user;
    },
    [refreshWorkspace]
  );

  const signOut = useCallback(
    async () => {
      await authRepository.signOut();
      setAuthUser(null);
      setAuthed(false);
      await refreshWorkspace();
    },
    [refreshWorkspace]
  );

  const addContract = useCallback(
    async (payload) => {
      await contractsRepository.createContract(payload);
      await refreshWorkspace();
    },
    [refreshWorkspace]
  );

  const updateContract = useCallback(
    async (id, payload) => {
      await contractsRepository.updateContract(id, payload);
      await refreshWorkspace();
    },
    [refreshWorkspace]
  );

  const deleteContract = useCallback(
    async (id) => {
      const res = await contractsRepository.deleteContract(id);
      await refreshWorkspace();
      return res;
    },
    [refreshWorkspace]
  );

  const recordSampleCheck = useCallback(
    async (contractId, opts) => {
      const res = await contractsRepository.recordSampleCheck(contractId, opts);
      await refreshWorkspace();
      return res;
    },
    [refreshWorkspace]
  );

  const runLiveEndpointCheck = useCallback(
    async (contractId, opts) => {
      const c = contracts.find((x) => x.id === contractId);
      if (!c) return { ok: false, error: 'Contract not found' };
      const rules = validationRules.filter((r) => r.contractId === contractId);
      const contract = { ...c, requestConfig: mergeRequestConfig(c) };
      const live = await contractsRepository.runLiveEndpointCheck({
        contract,
        rules,
        overrideSafeToReplay: Boolean(opts?.overrideSafeToReplay),
      });
      if (live.blocked) return { ok: false, blocked: true, error: live.error };
      if (live.ok === false && live.error) return live;
      if (live.ok !== true) return { ok: false, error: live.error || 'Live check failed' };
      try {
        const rec = await contractsRepository.recordLiveCheck(contractId, live);
        await refreshWorkspace();
        return { ...live, persisted: rec };
      } catch (e) {
        await refreshWorkspace();
        return {
          ...live,
          ok: true,
          persistError: e instanceof Error ? e.message : 'Failed to save check history',
          persisted: null,
        };
      }
    },
    [contracts, validationRules, refreshWorkspace]
  );

  const applyProposedResponse = useCallback(
    async (contractId, payload) => {
      const res = await contractsRepository.applyProposedResponse(contractId, payload);
      await refreshWorkspace();
      return res;
    },
    [refreshWorkspace]
  );

  const updateContractStatus = useCallback(
    async (id, status) => {
      await contractsRepository.updateContractStatus(id, status);
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
    async (contractId, rule) => {
      await validationRulesRepository.addValidationRule(contractId, rule);
      await refreshWorkspace();
    },
    [refreshWorkspace]
  );

  const value = useMemo(
    () => ({
      authed,
      authUser,
      authReady,
      signIn,
      signUp,
      signOut,
      dataReady,
      loadError,
      refreshWorkspace,
      contracts,
      addContract,
      updateContract,
      deleteContract,
      recordSampleCheck,
      runLiveEndpointCheck,
      applyProposedResponse,
      updateContractStatus,
      alerts,
      resolveAlert,
      validationRules,
      addValidationRule,
    }),
    [
      authed,
      authUser,
      authReady,
      signIn,
      signUp,
      signOut,
      dataReady,
      loadError,
      refreshWorkspace,
      contracts,
      addContract,
      updateContract,
      deleteContract,
      recordSampleCheck,
      runLiveEndpointCheck,
      applyProposedResponse,
      updateContractStatus,
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
