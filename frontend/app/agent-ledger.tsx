import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Modal, Alert, ActivityIndicator, StyleSheet, FlatList, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../src/utils/api';
import { useAuthStore } from '../src/store/authStore';
import { AgentLedgerSummary, User } from '../src/types';

export default function AgentLedgerScreen() {
  const { user, isAgent, isApprover } = useAuthStore();
  const [ledger, setLedger] = useState<AgentLedgerSummary | null>(null);
  const [agents, setAgents] = useState<User[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payMethod, setPayMethod] = useState<'cash' | 'bank' | 'upi' | 'card'>('cash');
  const [paying, setPaying] = useState(false);

  const fetchLedger = useCallback(async (agentId?: string) => {
    try {
      const params = agentId ? { sales_rep_id: agentId } : {};
      const res = await api.get('/agent-ledger', { params });
      setLedger(res.data);
    } catch (e) {
      Alert.alert('Error', 'Failed to load ledger');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  const fetchAgents = async () => {
    try {
      const res = await api.get('/users/agents');
      setAgents(res.data);
      if (res.data.length > 0 && !selectedAgent) {
        setSelectedAgent(res.data[0].user_id);
        fetchLedger(res.data[0].user_id);
      }
    } catch {}
  };

  useEffect(() => {
    if (isAgent) { fetchLedger(); }
    else if (isApprover) { fetchAgents(); }
  }, [isAgent, isApprover]);

  const handlePayment = async () => {
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) { Alert.alert('Error', 'Enter a valid amount'); return; }
    setPaying(true);
    try {
      const res = await api.post('/agent-ledger/payment', {
        sales_rep_id: isAgent ? user?.user_id : selectedAgent,
        amount, payment_method: payMethod, notes: payNotes,
      });
      Alert.alert('Payment Recorded', `New outstanding: ${res.data.new_outstanding?.toFixed(2)}`);
      setShowPayment(false); setPayAmount(''); setPayNotes('');
      fetchLedger(selectedAgent || undefined);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed');
    } finally { setPaying(false); }
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#3B82F6" /></View>;

  const agent = ledger?.agent;
  const isOverLimit = agent && agent.debt_ceiling > 0 && (ledger.outstanding_balance >= agent.debt_ceiling);
  const ceilingPct = agent?.debt_ceiling
    ? Math.min(100, (ledger!.outstanding_balance / agent.debt_ceiling) * 100)
    : 0;

  return (
    <ScrollView style={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLedger(selectedAgent || undefined); }} />}>
      
      <View style={s.header}>
        <Text style={s.headerTitle}>Agent Ledger</Text>
        {isApprover && (
          <TouchableOpacity style={s.addBtn} onPress={() => setShowPayment(true)}>
            <Ionicons name="cash-outline" size={16} color="#fff" />
            <Text style={s.addBtnText}>Record Payment</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Agent selector for managers */}
      {isApprover && agents.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.agentScroll}>
          {agents.map(a => (
            <TouchableOpacity key={a.user_id}
              style={[s.agentChip, selectedAgent === a.user_id && s.agentChipActive]}
              onPress={() => { setSelectedAgent(a.user_id); fetchLedger(a.user_id); }}>
              <Text style={[s.agentChipText, selectedAgent === a.user_id && s.agentChipTextActive]}>
                {a.name} {(a as any).is_flagged ? '⚠️' : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {ledger && (
        <>
          {/* Flag alert */}
          {agent?.is_flagged && (
            <View style={s.flagAlert}>
              <Ionicons name="warning" size={20} color="#FCA5A5" />
              <Text style={s.flagAlertText}>Debt ceiling reached! Outstanding balance equals or exceeds the limit.</Text>
            </View>
          )}

          {/* Summary cards */}
          <View style={s.summaryRow}>
            <View style={[s.summaryCard, { borderLeftColor: '#3B82F6' }]}>
              <Text style={s.summaryLabel}>Goods in Custody</Text>
              <Text style={s.summaryValue}>{ledger.total_custody_value?.toFixed(2)}</Text>
            </View>
            <View style={[s.summaryCard, { borderLeftColor: isOverLimit ? '#EF4444' : '#F59E0B' }]}>
              <Text style={s.summaryLabel}>Outstanding Balance</Text>
              <Text style={[s.summaryValue, isOverLimit && { color: '#EF4444' }]}>
                {ledger.outstanding_balance?.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Debt ceiling progress bar */}
          {agent && agent.debt_ceiling > 0 && (
            <View style={s.ceilingCard}>
              <View style={s.ceilingRow}>
                <Text style={s.ceilingLabel}>Debt Ceiling</Text>
                <Text style={s.ceilingValue}>{ledger.outstanding_balance?.toFixed(2)} / {agent.debt_ceiling?.toFixed(2)}</Text>
              </View>
              <View style={s.progressTrack}>
                <View style={[s.progressFill, { width: `${ceilingPct}%` as any,
                  backgroundColor: ceilingPct >= 100 ? '#EF4444' : ceilingPct >= 80 ? '#F59E0B' : '#10B981' }]} />
              </View>
              <Text style={s.ceilingPct}>{ceilingPct.toFixed(0)}% used</Text>
            </View>
          )}

          {/* Items in custody */}
          {ledger.items_in_custody.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Items in Custody</Text>
              {ledger.items_in_custody.map(item => (
                <View key={item.product_id} style={s.itemRow}>
                  <Text style={s.itemName}>{item.product_name}</Text>
                  <Text style={s.itemQty}>{item.quantity} units</Text>
                  <Text style={s.itemValue}>{(item.quantity * item.unit_price).toFixed(2)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Ledger history */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Transaction History</Text>
            {ledger.ledger_entries.map(entry => (
              <View key={entry.entry_id} style={s.entryRow}>
                <View style={[s.entryDot, { backgroundColor: entry.entry_type === 'payment' ? '#10B981' : '#3B82F6' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.entryType}>{entry.entry_type.toUpperCase()}</Text>
                  <Text style={s.entryNotes}>{entry.notes}</Text>
                  <Text style={s.entryDate}>{new Date(entry.created_at).toLocaleDateString()}</Text>
                </View>
                <Text style={[s.entryAmount, { color: entry.amount < 0 ? '#10B981' : '#F9FAFB' }]}>
                  {entry.amount < 0 ? '-' : '+'}{Math.abs(entry.amount).toFixed(2)}
                </Text>
              </View>
            ))}
            {!ledger.ledger_entries.length && <Text style={s.empty}>No transactions yet</Text>}
          </View>
        </>
      )}

      {/* Payment Modal */}
      <Modal visible={showPayment} animationType="slide" transparent onRequestClose={() => setShowPayment(false)}>
        <View style={s.overlay}>
          <View style={s.paymentModal}>
            <Text style={s.modalTitle}>Record Agent Payment</Text>
            <Text style={s.inputLabel}>Amount</Text>
            <TextInput style={s.input} keyboardType="decimal-pad" placeholder="0.00"
              placeholderTextColor="#6B7280" value={payAmount} onChangeText={setPayAmount} />
            <Text style={s.inputLabel}>Method</Text>
            <View style={s.methodRow}>
              {(['cash', 'bank', 'upi', 'card'] as const).map(m => (
                <TouchableOpacity key={m} style={[s.methodBtn, payMethod === m && s.methodBtnActive]}
                  onPress={() => setPayMethod(m)}>
                  <Text style={[s.methodBtnText, payMethod === m && s.methodBtnTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.inputLabel}>Notes (optional)</Text>
            <TextInput style={s.input} placeholder="Payment notes..." placeholderTextColor="#6B7280"
              value={payNotes} onChangeText={setPayNotes} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TouchableOpacity style={[s.btn, s.cancelBtn]} onPress={() => setShowPayment(false)}>
                <Text style={s.btnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, s.confirmBtn, paying && { opacity: 0.6 }]}
                onPress={handlePayment} disabled={paying}>
                {paying ? <ActivityIndicator color="#fff" size="small" /> :
                  <Text style={s.btnText}>Confirm</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, backgroundColor: '#1F2937', borderBottomWidth: 1, borderBottomColor: '#374151' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#F9FAFB' },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10B981',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 6 },
  addBtnText: { color: '#fff', fontWeight: '600' },
  agentScroll: { backgroundColor: '#1F2937', paddingVertical: 8, paddingHorizontal: 12 },
  agentChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#374151', marginRight: 8 },
  agentChipActive: { backgroundColor: '#3B82F6' },
  agentChipText: { color: '#9CA3AF', fontWeight: '500' },
  agentChipTextActive: { color: '#fff' },
  flagAlert: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#7F1D1D',
    margin: 12, borderRadius: 10, padding: 12, gap: 8 },
  flagAlertText: { color: '#FCA5A5', flex: 1, fontSize: 13 },
  summaryRow: { flexDirection: 'row', gap: 8, padding: 12 },
  summaryCard: { flex: 1, backgroundColor: '#1F2937', borderRadius: 12, padding: 14,
    borderLeftWidth: 4, borderColor: '#374151' },
  summaryLabel: { color: '#9CA3AF', fontSize: 12, marginBottom: 4 },
  summaryValue: { color: '#F9FAFB', fontSize: 20, fontWeight: 'bold' },
  ceilingCard: { backgroundColor: '#1F2937', margin: 12, borderRadius: 12, padding: 14 },
  ceilingRow: { flexDirection: 'row', justifyContent: 'space-between' },
  ceilingLabel: { color: '#9CA3AF', fontSize: 13 },
  ceilingValue: { color: '#F9FAFB', fontWeight: '600' },
  progressTrack: { height: 8, backgroundColor: '#374151', borderRadius: 4, marginTop: 8 },
  progressFill: { height: 8, borderRadius: 4 },
  ceilingPct: { color: '#6B7280', fontSize: 11, marginTop: 4, textAlign: 'right' },
  section: { backgroundColor: '#1F2937', margin: 12, borderRadius: 12, padding: 14 },
  sectionTitle: { color: '#F9FAFB', fontWeight: 'bold', fontSize: 15, marginBottom: 10 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: '#374151' },
  itemName: { flex: 1, color: '#F9FAFB' },
  itemQty: { color: '#9CA3AF', marginRight: 12 },
  itemValue: { color: '#3B82F6', fontWeight: '600', minWidth: 70, textAlign: 'right' },
  entryRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#374151', gap: 10 },
  entryDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  entryType: { color: '#F9FAFB', fontWeight: '600', fontSize: 13 },
  entryNotes: { color: '#9CA3AF', fontSize: 12 },
  entryDate: { color: '#6B7280', fontSize: 11 },
  entryAmount: { fontWeight: 'bold', fontSize: 15, minWidth: 70, textAlign: 'right' },
  empty: { color: '#6B7280', textAlign: 'center', padding: 20 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  paymentModal: { backgroundColor: '#1F2937', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#F9FAFB', marginBottom: 16 },
  inputLabel: { color: '#9CA3AF', fontSize: 13, marginBottom: 4, marginTop: 10 },
  input: { backgroundColor: '#111827', color: '#F9FAFB', borderWidth: 1, borderColor: '#374151',
    borderRadius: 8, padding: 12 },
  methodRow: { flexDirection: 'row', gap: 6 },
  methodBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: '#374151' },
  methodBtnActive: { backgroundColor: '#3B82F6' },
  methodBtnText: { color: '#9CA3AF', fontWeight: '500' },
  methodBtnTextActive: { color: '#fff' },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#374151' },
  confirmBtn: { backgroundColor: '#10B981' },
  btnText: { color: '#fff', fontWeight: 'bold' },
});
