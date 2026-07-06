import { AutomationWorkflow, AutomationRule } from './types';

export const Reactivation90Workflow: AutomationWorkflow = {
  id: 'wf_reactivation_90',
  name: 'Reactivación 90 días',
  isActive: true,
  startStepId: 'step_1',
  steps: {
    'step_1': {
        id: 'step_1',
        type: 'action',
        actionType: 'email',
        templateId: 'tpl_reactivation_90',
        nextStepId: undefined
    }
  }
};

export const Reactivation90Rule: AutomationRule = {
    id: 'rule_reactivation_90',
    name: 'Reactivación 90 días',
    isActive: true,
    triggerEvent: 'client_inactivity_90d',
    conditions: [
        { field: 'journeyState', operator: 'equals', value: 'Dormido (90d)' }
    ],
    workflowId: 'wf_reactivation_90'
};

export const FirstPurchaseWorkflow: AutomationWorkflow = {
  id: 'wf_first_purchase',
  name: 'Primera Compra',
  isActive: true,
  startStepId: 'step_1',
  steps: {
    'step_1': {
        id: 'step_1',
        type: 'action',
        actionType: 'email',
        templateId: 'tpl_first_purchase',
        nextStepId: undefined
    }
  }
};

export const FirstPurchaseRule: AutomationRule = {
    id: 'rule_first_purchase',
    name: 'Primera Compra',
    isActive: true,
    triggerEvent: 'first_purchase',
    conditions: [],
    workflowId: 'wf_first_purchase'
};

export const CategoryChangeWorkflow: AutomationWorkflow = {
  id: 'wf_category_change',
  name: 'Cambio de Categoría',
  isActive: true,
  startStepId: 'step_1',
  steps: {
    'step_1': {
        id: 'step_1',
        type: 'action',
        actionType: 'email',
        templateId: 'tpl_category_change',
        nextStepId: undefined
    }
  }
};

export const CategoryChangeRule: AutomationRule = {
    id: 'rule_category_change',
    name: 'Cambio de Categoría',
    isActive: true,
    triggerEvent: 'category_changed',
    conditions: [],
    workflowId: 'wf_category_change'
};

export const VIPWorkflow: AutomationWorkflow = {
  id: 'wf_vip_notification',
  name: 'Notificación Cliente VIP',
  isActive: true,
  startStepId: 'step_1',
  steps: {
    'step_1': {
        id: 'step_1',
        type: 'action',
        actionType: 'email',
        templateId: 'tpl_vip_notification',
        nextStepId: undefined
    }
  }
};

export const VIPRule: AutomationRule = {
    id: 'rule_vip_notification',
    name: 'Notificación Cliente VIP',
    isActive: true,
    triggerEvent: 'client_vip_status_changed',
    conditions: [
        { field: 'isVIP', operator: 'equals', value: true }
    ],
    workflowId: 'wf_vip_notification'
};

export const BirthdayWorkflow: AutomationWorkflow = {
  id: 'wf_birthday',
  name: 'Cumpleaños y Fechas Especiales',
  isActive: true,
  startStepId: 'step_1',
  steps: {
    'step_1': {
        id: 'step_1',
        type: 'action',
        actionType: 'email',
        templateId: 'tpl_birthday',
        nextStepId: undefined
    }
  }
};

export const BirthdayRule: AutomationRule = {
    id: 'rule_birthday',
    name: 'Cumpleaños y Fechas Especiales',
    isActive: true,
    triggerEvent: 'client_birthday',
    conditions: [],
    workflowId: 'wf_birthday'
};
