import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import NavHeader from '../components/NavHeader';

import { API_BASE_URL } from '../config/api';

export default function CustomizeScreen({ route, navigation }: any) {
  const { sessionId } = route.params;
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Chat history (local UI only)
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hi! How would you like to rewrite or format these notes?" }
  ]);

  const handleCustomize = async (customPrompt = prompt) => {
    if (!customPrompt.trim()) return;
    
    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', text: customPrompt }]);
    setPrompt('');
    setIsProcessing(true);

    try {
      await axios.post(`${API_BASE_URL}/reformat-notes`, {
        session_id: sessionId,
        instruction: customPrompt
      });
      
      Alert.alert('Success', 'Notes updated! Going back to view them.');
      navigation.goBack();
    } catch (err) {
      console.error('Error customizing notes:', err);
      Alert.alert('Error', 'Failed to customize notes. Please try again.');
      setMessages(prev => [...prev, { role: 'assistant', text: "Sorry, I ran into an error. Please try again." }]);
      setIsProcessing(false);
    }
  };

  const renderBubble = (msg, index) => {
    const isUser = msg.role === 'user';
    return (
      <View key={index} style={[styles.bubbleWrapper, isUser ? styles.bubbleUserWrapper : styles.bubbleAiWrapper]}>
        {!isUser && <Text style={styles.aiAvatar}>✨</Text>}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi]}>
          <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAi]}>{msg.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.container}
      >
        <NavHeader title="AI Assistant" />

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {messages.map(renderBubble)}
          
          {isProcessing && (
             <View style={[styles.bubbleWrapper, styles.bubbleAiWrapper]}>
               <Text style={styles.aiAvatar}>✨</Text>
               <View style={[styles.bubble, styles.bubbleAi, { paddingHorizontal: 20 }]}>
                 <ActivityIndicator color="#284b63" />
               </View>
             </View>
          )}

          {/* Suggestions if no user message yet */}
          {messages.length === 1 && (
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionTitle}>Suggestions</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity style={styles.pill} onPress={() => handleCustomize("Make it shorter and more concise")}>
                  <Text style={styles.pillText}>Make it shorter</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pill} onPress={() => handleCustomize("Format this entirely as bullet points")}>
                  <Text style={styles.pillText}>Use bullet points</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pill} onPress={() => handleCustomize("Translate the notes to Spanish")}>
                  <Text style={styles.pillText}>Translate to Spanish</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Customize with AI..."
            placeholderTextColor="rgba(53, 53, 53, 0.5)"
            value={prompt}
            onChangeText={setPrompt}
            editable={!isProcessing}
            onSubmitEditing={() => handleCustomize(prompt)}
          />
          
          <TouchableOpacity 
            style={[styles.sendBtn, (!prompt.trim() || isProcessing) && styles.sendBtnDisabled]}
            onPress={() => handleCustomize(prompt)}
            disabled={!prompt.trim() || isProcessing}
          >
            <Text style={styles.sendBtnText}>↑</Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 20,
    flexGrow: 1,
  },
  bubbleWrapper: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-end',
  },
  bubbleUserWrapper: {
    justifyContent: 'flex-end',
  },
  bubbleAiWrapper: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    fontSize: 20,
    marginRight: 10,
    marginBottom: 5,
  },
  bubble: {
    maxWidth: '80%',
    padding: 14,
    borderRadius: 20,
  },
  bubbleUser: {
    backgroundColor: '#284b63',
    borderBottomRightRadius: 4,
  },
  bubbleAi: {
    backgroundColor: '#d9d9d9',
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 16,
    lineHeight: 22,
  },
  bubbleTextUser: {
    color: '#fff',
  },
  bubbleTextAi: {
    color: '#353535',
  },
  suggestionsContainer: {
    marginTop: 20,
  },
  suggestionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(53, 53, 53, 0.6)',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  pill: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  pillText: {
    color: '#353535',
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    paddingBottom: Platform.OS === 'ios' ? 20 : 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#d9d9d9',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#d9d9d9',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    color: '#353535',
    maxHeight: 100,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#284b63',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  sendBtnDisabled: {
    backgroundColor: 'rgba(40, 75, 99, 0.3)',
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginTop: -2,
  }
});
