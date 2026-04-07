import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { SG_RATE, getPreservationAge, getMinPensionDrawdown } from '../utils/calculations';

const AppContext = createContext();

const defaultMember = {
  id: Date.now(),
  name: '',
  age: 45,
  gender: 'Male',
  dob: '1981-01-01',
  salary: 100000,
  sgContributions: 11500,
  salarySacrifice: 0,
  nonConcessional: 0,
  personalDeductible: 0,
  preservationAge: 60,
  yearsToRetirement: 15,
  phase: 'accumulation',
  pensionDrawdownRate: 4,
  insuranceDeath: 0,
  insuranceTPD: 0,
  insuranceIP: 0,
};

const defaultFund = {
  name: 'My SMSF',
  abn: '',
  establishmentDate: '',
  trusteeType: 'Corporate',
  members: [{ ...defaultMember, id: 1 }],
  currentBalance: 500000,
  allocationCash: 30,
  allocationShares: 40,
  allocationProperty: 20,
  allocationOther: 10,
  existingIncome: 25000,
};

const defaultExpenses = {
  administration: 4000,
  audit: 1500,
  accounting: 2500,
  asicFee: 63,
  atoLevy: 259,
  investmentMgmt: 0,
  legalAdvisory: 0,
  bankFees: 200,
  other: 0,
};

const defaultProperty = {
  purchasePrice: 650000,
  propertyType: 'House',
  state: 'NSW',
  suburb: '',
  bedrooms: 3,
  bathrooms: 2,
  carSpaces: 1,
  landSize: 500,
  floorArea: 150,
  yearBuilt: 2000,
  lvr: 70,
  interestRate: 6.5,
  loanTerm: 25,
  repaymentType: 'IO',
  ioPeriod: 5,
  weeklyRent: 550,
  vacancyWeeks: 2,
  managementFee: 8,
  landlordInsurance: 1800,
  councilRates: 2000,
  waterRates: 1000,
  strata: 0,
  repairs: 2000,
  landTax: 0,
  legalConveyancing: 2500,
  legalLRBA: 3500,
  trustDeedReview: 1500,
  lenderAppFee: 600,
  valuationFee: 500,
  buildingPest: 800,
  quantitySurveyor: 700,
  strataSearches: 300,
  smsfAdviserFee: 2500,
  buyersAgentFee: 0,
  otherAcquisition: 0,
};

const defaultProjections = {
  capitalGrowthRate: 5,
  rentGrowthRate: 3,
  expenseInflationRate: 2.5,
  contributionGrowthRate: 2,
  projectionYears: 20,
};

const defaultScenarios = {
  interestRateShock: 0,
  extendedVacancy: 0,
  propertyDecline: 0,
  contributionReduction: 0,
  rentalReduction: 0,
  expenseIncrease: 0,
};

const defaultCompliance = {
  trustDeed: Array(8).fill('unsure'),
  investmentStrategy: Array(9).fill('unsure'),
  solePurpose: Array(8).fill('unsure'),
  memberUnderstanding: Array(8).fill('unsure'),
  professionalAdvice: Array(3).fill('unsure'),
  notes: {},
};

const initialState = {
  activeSection: 'fund-setup',
  sidebarCollapsed: false,
  darkMode: true,
  fund: defaultFund,
  expenses: defaultExpenses,
  property: defaultProperty,
  projections: defaultProjections,
  scenarios: defaultScenarios,
  compliance: defaultCompliance,
  additionalProperties: [],
  savedScenarios: [],
  scenarioName: 'Default',
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_SECTION':
      return { ...state, activeSection: action.payload };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
    case 'TOGGLE_DARK_MODE':
      return { ...state, darkMode: !state.darkMode };
    case 'UPDATE_FUND':
      return { ...state, fund: { ...state.fund, ...action.payload } };
    case 'UPDATE_MEMBER': {
      const members = state.fund.members.map((m) =>
        m.id === action.payload.id ? { ...m, ...action.payload.data } : m
      );
      // Auto-calc SG
      const updatedMembers = members.map((m) => {
        const sg = Math.round((m.salary || 0) * SG_RATE);
        const presAge = getPreservationAge(m.dob);
        const pensionRate = m.phase === 'pension' ? getMinPensionDrawdown(m.age) * 100 : m.pensionDrawdownRate;
        return { ...m, sgContributions: sg, preservationAge: presAge, pensionDrawdownRate: pensionRate };
      });
      return { ...state, fund: { ...state.fund, members: updatedMembers } };
    }
    case 'ADD_MEMBER': {
      if (state.fund.members.length >= 6) return state;
      const newMember = { ...defaultMember, id: Date.now(), name: `Member ${state.fund.members.length + 1}` };
      return { ...state, fund: { ...state.fund, members: [...state.fund.members, newMember] } };
    }
    case 'REMOVE_MEMBER': {
      if (state.fund.members.length <= 1) return state;
      return { ...state, fund: { ...state.fund, members: state.fund.members.filter((m) => m.id !== action.payload) } };
    }
    case 'UPDATE_EXPENSES':
      return { ...state, expenses: { ...state.expenses, ...action.payload } };
    case 'UPDATE_PROPERTY':
      return { ...state, property: { ...state.property, ...action.payload } };
    case 'UPDATE_PROJECTIONS':
      return { ...state, projections: { ...state.projections, ...action.payload } };
    case 'UPDATE_SCENARIOS':
      return { ...state, scenarios: { ...state.scenarios, ...action.payload } };
    case 'UPDATE_COMPLIANCE':
      return { ...state, compliance: { ...state.compliance, ...action.payload } };
    case 'ADD_PROPERTY': {
      const newProp = {
        ...defaultProperty,
        id: Date.now(),
        targetYear: 5,
        purchasePrice: 700000,
        fundingSource: 'equity',
      };
      return { ...state, additionalProperties: [...state.additionalProperties, newProp] };
    }
    case 'UPDATE_ADDITIONAL_PROPERTY': {
      const props = state.additionalProperties.map((p) =>
        p.id === action.payload.id ? { ...p, ...action.payload.data } : p
      );
      return { ...state, additionalProperties: props };
    }
    case 'REMOVE_ADDITIONAL_PROPERTY':
      return { ...state, additionalProperties: state.additionalProperties.filter((p) => p.id !== action.payload) };
    case 'SAVE_SCENARIO': {
      const scenario = { name: action.payload, timestamp: Date.now(), state: { ...state, savedScenarios: [] } };
      return { ...state, savedScenarios: [...state.savedScenarios.filter(s => s.name !== action.payload), scenario], scenarioName: action.payload };
    }
    case 'LOAD_SCENARIO': {
      const scenario = state.savedScenarios.find((s) => s.name === action.payload);
      if (!scenario) return state;
      return { ...scenario.state, savedScenarios: state.savedScenarios, scenarioName: action.payload };
    }
    case 'LOAD_STATE':
      return { ...action.payload, activeSection: state.activeSection };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState, (init) => {
    try {
      const saved = localStorage.getItem('smsf-modeller-state');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...init, ...parsed, activeSection: init.activeSection };
      }
    } catch (e) { /* ignore */ }
    return init;
  });

  useEffect(() => {
    try {
      localStorage.setItem('smsf-modeller-state', JSON.stringify(state));
    } catch (e) { /* ignore */ }
  }, [state]);

  const setSection = useCallback((s) => dispatch({ type: 'SET_SECTION', payload: s }), []);
  const toggleSidebar = useCallback(() => dispatch({ type: 'TOGGLE_SIDEBAR' }), []);
  const toggleDarkMode = useCallback(() => dispatch({ type: 'TOGGLE_DARK_MODE' }), []);
  const updateFund = useCallback((d) => dispatch({ type: 'UPDATE_FUND', payload: d }), []);
  const updateMember = useCallback((id, data) => dispatch({ type: 'UPDATE_MEMBER', payload: { id, data } }), []);
  const addMember = useCallback(() => dispatch({ type: 'ADD_MEMBER' }), []);
  const removeMember = useCallback((id) => dispatch({ type: 'REMOVE_MEMBER', payload: id }), []);
  const updateExpenses = useCallback((d) => dispatch({ type: 'UPDATE_EXPENSES', payload: d }), []);
  const updateProperty = useCallback((d) => dispatch({ type: 'UPDATE_PROPERTY', payload: d }), []);
  const updateProjections = useCallback((d) => dispatch({ type: 'UPDATE_PROJECTIONS', payload: d }), []);
  const updateScenarios = useCallback((d) => dispatch({ type: 'UPDATE_SCENARIOS', payload: d }), []);
  const updateCompliance = useCallback((d) => dispatch({ type: 'UPDATE_COMPLIANCE', payload: d }), []);
  const addProperty = useCallback(() => dispatch({ type: 'ADD_PROPERTY' }), []);
  const updateAdditionalProperty = useCallback((id, data) => dispatch({ type: 'UPDATE_ADDITIONAL_PROPERTY', payload: { id, data } }), []);
  const removeAdditionalProperty = useCallback((id) => dispatch({ type: 'REMOVE_ADDITIONAL_PROPERTY', payload: id }), []);
  const saveScenario = useCallback((name) => dispatch({ type: 'SAVE_SCENARIO', payload: name }), []);
  const loadScenario = useCallback((name) => dispatch({ type: 'LOAD_SCENARIO', payload: name }), []);

  return (
    <AppContext.Provider value={{
      state, dispatch, setSection, toggleSidebar, toggleDarkMode,
      updateFund, updateMember, addMember, removeMember,
      updateExpenses, updateProperty, updateProjections, updateScenarios,
      updateCompliance, addProperty, updateAdditionalProperty, removeAdditionalProperty,
      saveScenario, loadScenario,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
