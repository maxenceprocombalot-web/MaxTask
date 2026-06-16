// Onglet Claude IA — interface chat style iMessage sombre
import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';
import { useAppData } from '../hooks/useAppData';
import { Message } from '../types';
import { sendMessage } from '../utils/claudeApi';

const QUICK_PROMPTS = [
  { icon: '🎯', text: 'Quelles sont mes 3 priorités aujourd\'hui ?' },
  { icon: '📅', text: 'Planifie ma semaine' },
  { icon: '📊', text: 'Résume ma semaine' },
  { icon: '⚡', text: 'J\'ai 30 minutes — que faire ?' },
];

export default function ClaudeScreen() {
  const { data, addMessage, clearChat } = useAppData();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const messages = data.chatHistory;
  const hasApiKey = !!data.settings.anthropicKey;

  async function handleSend(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInput('');

    const userMsg: Message = {
      id: `msg_${Date.now()}_u`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    await addMessage(userMsg);

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    setLoading(true);
    try {
      const response = await sendMessage(
        content,
        messages,
        data.tasks,
        data.settings.anthropicKey,
      );
      const assistantMsg: Message = {
        id: `msg_${Date.now()}_a`,
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      };
      await addMessage(assistantMsg);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err: any) {
      const errMsg: Message = {
        id: `msg_${Date.now()}_err`,
        role: 'assistant',
        content: `❌ Erreur : ${err?.message ?? 'Impossible de contacter Claude'}`,
        timestamp: new Date().toISOString(),
      };
      await addMessage(errMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Claude IA 🤖</Text>
          <Text style={styles.headerSub}>
            {hasApiKey ? 'Connecté · Sonnet 4.6' : 'Mode démo — Clé API manquante'}
          </Text>
        </View>
        {messages.length > 0 && (
          <TouchableOpacity onPress={clearChat} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>Effacer</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 && (
          <View style={styles.welcome}>
            <Text style={styles.welcomeEmoji}>🤖</Text>
            <Text style={styles.welcomeTitle}>Ton assistant productivité</Text>
            <Text style={styles.welcomeText}>
              Je connais toutes tes tâches et projets. Pose-moi une question ou utilise une suggestion rapide.
            </Text>
            {!hasApiKey && (
              <View style={styles.demoBanner}>
                <Text style={styles.demoBannerText}>
                  ⚠️ Mode démo — Ajoute ta clé API dans Paramètres pour des réponses IA personnalisées
                </Text>
              </View>
            )}
          </View>
        )}

        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {loading && (
          <View style={styles.typingIndicator}>
            <ActivityIndicator size="small" color={Colors.accent} />
            <Text style={styles.typingText}>Claude réfléchit...</Text>
          </View>
        )}
      </ScrollView>

      {/* Suggestions rapides */}
      {messages.length === 0 && !loading && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickPrompts}
          contentContainerStyle={styles.quickPromptsContent}
        >
          {QUICK_PROMPTS.map((p, i) => (
            <TouchableOpacity
              key={i}
              style={styles.quickPrompt}
              onPress={() => handleSend(p.text)}
            >
              <Text style={styles.quickPromptIcon}>{p.icon}</Text>
              <Text style={styles.quickPromptText}>{p.text}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Message à Claude..."
          placeholderTextColor={Colors.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={2000}
          onSubmitEditing={() => handleSend()}
          returnKeyType="send"
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={() => handleSend()}
          disabled={!input.trim() || loading}
        >
          <Text style={styles.sendBtnText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const time = new Date(message.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
      <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant]}>
        {message.content}
      </Text>
      <Text style={[styles.bubbleTime, isUser ? styles.bubbleTimeUser : styles.bubbleTimeAssistant]}>{time}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.cardBorder,
  },
  headerTitle: { color: Colors.textPrimary, fontSize: 20, fontWeight: '700' },
  headerSub: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  clearBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.surfaceElevated },
  clearBtnText: { color: Colors.textSecondary, fontSize: 13 },
  messages: { flex: 1 },
  messagesContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  welcome: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  welcomeEmoji: { fontSize: 56, marginBottom: 16 },
  welcomeTitle: { color: Colors.textPrimary, fontSize: 20, fontWeight: '600', marginBottom: 8 },
  welcomeText: { color: Colors.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  demoBanner: {
    marginTop: 20, padding: 14, borderRadius: 12,
    backgroundColor: Colors.orangeLight, borderWidth: 1, borderColor: Colors.orange,
  },
  demoBannerText: { color: Colors.orange, fontSize: 13, textAlign: 'center' },
  bubble: {
    maxWidth: '82%', marginBottom: 10, padding: 12, borderRadius: 18,
  },
  bubbleUser: {
    alignSelf: 'flex-end', backgroundColor: Colors.accent,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    alignSelf: 'flex-start', backgroundColor: Colors.surfaceElevated,
    borderWidth: 1, borderColor: Colors.cardBorder, borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTextUser: { color: Colors.white },
  bubbleTextAssistant: { color: Colors.textPrimary },
  bubbleTime: { fontSize: 10, marginTop: 6 },
  bubbleTimeUser: { color: 'rgba(255,255,255,0.6)', textAlign: 'right' },
  bubbleTimeAssistant: { color: Colors.textMuted },
  typingIndicator: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'flex-start', padding: 12,
    backgroundColor: Colors.surfaceElevated, borderRadius: 18,
    borderBottomLeftRadius: 4, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  typingText: { color: Colors.textSecondary, fontSize: 13 },
  quickPrompts: { maxHeight: 100 },
  quickPromptsContent: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  quickPrompt: {
    backgroundColor: Colors.surfaceElevated, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.cardBorder,
    paddingHorizontal: 14, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    maxWidth: 240,
  },
  quickPromptIcon: { fontSize: 16 },
  quickPromptText: { color: Colors.textSecondary, fontSize: 13, flex: 1 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32,
    borderTopWidth: 1, borderTopColor: Colors.cardBorder,
    backgroundColor: Colors.background, gap: 10,
  },
  input: {
    flex: 1, backgroundColor: Colors.surfaceElevated,
    borderRadius: 22, borderWidth: 1, borderColor: Colors.cardBorder,
    color: Colors.textPrimary, fontSize: 15,
    paddingHorizontal: 16, paddingVertical: 10,
    maxHeight: 120,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: Colors.white, fontSize: 18, fontWeight: '700' },
});
