import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import NavHeader from '../components/NavHeader';

const DEMO_NOTES = [
  {
    id: '1',
    title: "Meeting Notes - Q1 Review",
    date: "2024-04-20",
    preview: "Discussed quarterly performance, key metrics, and upcoming goals...",
    emoji: "📊",
    category: "Business"
  },
  {
    id: '2',
    title: "Lecture - Machine Learning Basics",
    date: "2024-04-18",
    preview: "Covered supervised vs unsupervised learning, neural networks...",
    emoji: "🎓",
    category: "Education"
  },
  {
    id: '3',
    title: "Project Ideas Brainstorming",
    date: "2024-04-15",
    preview: "New app features: realtime sync, dark mode, offline support...",
    emoji: "💡",
    category: "Personal"
  }
];

export default function HistoryScreen({ navigation }) {
  
  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.emoji}>{item.emoji}</Text>
          <Text style={styles.title}>{item.title}</Text>
        </View>
        <Text style={styles.date}>{item.date}</Text>
      </View>
      <Text style={styles.preview} numberOfLines={2}>{item.preview}</Text>
      <View style={styles.tag}>
        <Text style={styles.tagText}>{item.category}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <NavHeader title="Notes History" />
      
      <FlatList
        data={DEMO_NOTES}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 50,
  },
  listContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#284b63',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  emoji: {
    fontSize: 20,
    marginRight: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#353535',
    flex: 1,
  },
  date: {
    fontSize: 12,
    color: 'rgba(53, 53, 53, 0.5)',
    marginLeft: 10,
  },
  preview: {
    fontSize: 14,
    color: 'rgba(53, 53, 53, 0.7)',
    lineHeight: 20,
    marginBottom: 16,
  },
  tag: {
    alignSelf: 'flex-start',
    backgroundColor: '#d9d9d9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  tagText: {
    color: '#284b63',
    fontSize: 12,
    fontWeight: '600',
  }
});
