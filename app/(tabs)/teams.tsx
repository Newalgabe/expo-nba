import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  FlatList,
} from 'react-native';
import axios from 'axios';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { router } from 'expo-router';

interface Team {
  id: string;
  team: {
    id: string;
    displayName: string;
    abbreviation: string;
    logos: Array<{
      href: string;
    }>;
    color: string;
    alternateColor: string;
    record?: {
      items: Array<{
        summary: string;
      }>;
    };
  };
}

export default function TeamsScreen() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();

  const fetchTeams = async () => {
    try {
      const response = await axios.get(
        'http://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams'
      );
      setTeams(response.data.sports[0].leagues[0].teams || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTeams();
  };

  const handleTeamPress = (team: Team) => {
    router.push(`/team/${team.id}`);
  };

  const renderTeam = ({ item }: { item: any }) => {
    const team = item.team;
    
    return (
      <TouchableOpacity
        style={[styles.teamCard, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}
        onPress={() => handleTeamPress(team)}
      >
        <View style={styles.teamHeader}>
          <Image
            source={{ uri: team.logos?.[0]?.href }}
            style={styles.teamLogo}
            resizeMode="contain"
          />
          <View style={styles.teamInfo}>
            <ThemedText style={styles.teamName}>{team.displayName}</ThemedText>
            <ThemedText style={styles.teamAbbr}>{team.abbreviation}</ThemedText>
          </View>
        </View>
        
        {team.record?.items?.[0] && (
          <View style={styles.recordContainer}>
            <ThemedText style={styles.recordText}>
              Record: {team.record.items[0].summary}
            </ThemedText>
          </View>
        )}
        
        <View style={[styles.teamColorBar, { backgroundColor: `#${team.color}` }]} />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} />
          <ThemedText style={styles.loadingText}>Loading teams...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>NBA Teams</ThemedText>
        <ThemedText style={styles.subtitle}>{teams.length} teams</ThemedText>
      </View>
      
      <FlatList
        data={teams}
        renderItem={renderTeam}
        keyExtractor={(item: Team) => item.team.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        numColumns={1}
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    marginTop: 5,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  teamCard: {
    marginBottom: 15,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    position: 'relative',
    overflow: 'hidden',
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamLogo: {
    width: 50,
    height: 50,
    marginRight: 15,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  teamAbbr: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 2,
  },
  recordContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  recordText: {
    fontSize: 14,
    fontWeight: '500',
  },
  teamColorBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
});
