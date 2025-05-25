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

interface Team {
  id: string;
  displayName: string;
  abbreviation: string;
  logo: string;
  record?: {
    wins: number;
    losses: number;
  };
  conference?: string;
  division?: string;
  standing?: {
    conferenceRank: number;
    divisionRank: number;
  };
}

interface GameOdds {
  gameId: string;
  gameDate: string;
  gameTime: string;
  homeTeam: {
    teamId: string;
    teamName: string;
    teamTricode: string;
    teamCity: string;
    teamLogo: string;
  };
  awayTeam: {
    teamId: string;
    teamName: string;
    teamTricode: string;
    teamCity: string;
    teamLogo: string;
  };
  gameStatus: string;
  gameStatusText: string;
  period: number;
  gameClock: string;
  homeTeamScore?: number;
  awayTeamScore?: number;
  pointSpread?: {
    homeTeamOdds: {
      pointSpread: number;
      pointSpreadOdds: number;
    };
    awayTeamOdds: {
      pointSpread: number;
      pointSpreadOdds: number;
    };
  };
  overUnder?: {
    total: number;
    overOdds: number;
    underOdds: number;
  };
  moneyLine?: {
    homeTeamOdds: number;
    awayTeamOdds: number;
  };
}

interface TodaysGamesResponse {
  games: GameOdds[];
}

interface ApiResponse {
  teams: Team[];
}

export default function TeamsScreen() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [todaysGames, setTodaysGames] = useState<GameOdds[]>([]);
  const [loading, setLoading] = useState(true);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'teams' | 'games'>('teams');
  const colorScheme = useColorScheme();

  const fetchTeams = async () => {
    try {
      // Using the NBA API endpoint for the 2024-25 season
      const response = await axios.get<ApiResponse>(
        'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams?season=2024'
      );
      
      // Sort teams by conference and then by record
      const sortedTeams = (response.data.teams || []).sort((a, b) => {
        // First sort by conference
        if (a.conference !== b.conference) {
          return a.conference === 'Eastern' ? -1 : 1;
        }
        // Then sort by wins
        const aWins = a.record?.wins || 0;
        const bWins = b.record?.wins || 0;
        return bWins - aWins;
      });
      
      setTeams(sortedTeams);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodaysGames = async () => {
    try {
      const response = await axios.get<TodaysGamesResponse>(
        'https://cdn.nba.com/static/json/liveData/odds/odds_todaysGames.json'
      );
      
      setTodaysGames(response.data.games || []);
    } catch (error) {
      console.error('Error fetching today\'s games:', error);
      setTodaysGames([]);
    } finally {
      setGamesLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
    fetchTodaysGames();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([fetchTeams(), fetchTodaysGames()]).finally(() => {
      setRefreshing(false);
    });
  };

  const formatOdds = (odds: number): string => {
    return odds > 0 ? `+${odds}` : odds.toString();
  };

  const formatTime = (timeString: string): string => {
    try {
      const time = new Date(`1970-01-01T${timeString}`);
      return time.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } catch {
      return timeString;
    }
  };

  const renderGameCard = ({ item }: { item: GameOdds }) => {
    const isLive = item.gameStatus === '2';
    const isCompleted = item.gameStatus === '3';
    const isUpcoming = item.gameStatus === '1';

    return (
      <View style={[styles.gameCard, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
        {/* Game Status Header */}
        <View style={styles.gameStatusHeader}>
          <ThemedText style={[styles.gameStatusText, { 
            color: isLive ? '#ff4444' : isCompleted ? '#00aa00' : '#666' 
          }]}>
            {isLive ? `LIVE - ${item.gameClock} Q${item.period}` : 
             isCompleted ? 'FINAL' : 
             formatTime(item.gameTime)}
          </ThemedText>
        </View>

        {/* Teams */}
        <View style={styles.teamsContainer}>
          {/* Away Team */}
          <View style={styles.teamSection}>
            <View style={styles.teamInfo}>
              <Image 
                source={{ uri: item.awayTeam.teamLogo }} 
                style={styles.teamLogo} 
                resizeMode="contain"
              />
              <View>
                <ThemedText style={styles.teamName}>
                  {item.awayTeam.teamCity} {item.awayTeam.teamName}
                </ThemedText>
                <ThemedText style={styles.teamTricode}>
                  {item.awayTeam.teamTricode}
                </ThemedText>
              </View>
            </View>
            {(isLive || isCompleted) && item.awayTeamScore !== undefined && (
              <ThemedText style={styles.score}>{item.awayTeamScore}</ThemedText>
            )}
          </View>

          <ThemedText style={styles.vsText}>@</ThemedText>

          {/* Home Team */}
          <View style={styles.teamSection}>
            <View style={styles.teamInfo}>
              <Image 
                source={{ uri: item.homeTeam.teamLogo }} 
                style={styles.teamLogo} 
                resizeMode="contain"
              />
              <View>
                <ThemedText style={styles.teamName}>
                  {item.homeTeam.teamCity} {item.homeTeam.teamName}
                </ThemedText>
                <ThemedText style={styles.teamTricode}>
                  {item.homeTeam.teamTricode}
                </ThemedText>
              </View>
            </View>
            {(isLive || isCompleted) && item.homeTeamScore !== undefined && (
              <ThemedText style={styles.score}>{item.homeTeamScore}</ThemedText>
            )}
          </View>
        </View>

        {/* Betting Odds (only for upcoming games) */}
        {isUpcoming && (item.pointSpread || item.moneyLine || item.overUnder) && (
          <View style={styles.oddsContainer}>
            <ThemedText style={styles.oddsTitle}>Betting Odds</ThemedText>
            
            <View style={styles.oddsRow}>
              {/* Point Spread */}
              {item.pointSpread && (
                <View style={styles.oddsStat}>
                  <ThemedText style={styles.oddsLabel}>Spread</ThemedText>
                  <ThemedText style={styles.oddsValue}>
                    {item.awayTeam.teamTricode}: {item.pointSpread.awayTeamOdds.pointSpread > 0 ? '+' : ''}{item.pointSpread.awayTeamOdds.pointSpread}
                  </ThemedText>
                  <ThemedText style={styles.oddsValue}>
                    {item.homeTeam.teamTricode}: {item.pointSpread.homeTeamOdds.pointSpread > 0 ? '+' : ''}{item.pointSpread.homeTeamOdds.pointSpread}
                  </ThemedText>
                </View>
              )}

              {/* Money Line */}
              {item.moneyLine && (
                <View style={styles.oddsStat}>
                  <ThemedText style={styles.oddsLabel}>Money Line</ThemedText>
                  <ThemedText style={styles.oddsValue}>
                    {item.awayTeam.teamTricode}: {formatOdds(item.moneyLine.awayTeamOdds)}
                  </ThemedText>
                  <ThemedText style={styles.oddsValue}>
                    {item.homeTeam.teamTricode}: {formatOdds(item.moneyLine.homeTeamOdds)}
                  </ThemedText>
                </View>
              )}

              {/* Over/Under */}
              {item.overUnder && (
                <View style={styles.oddsStat}>
                  <ThemedText style={styles.oddsLabel}>O/U</ThemedText>
                  <ThemedText style={styles.oddsValue}>
                    Total: {item.overUnder.total}
                  </ThemedText>
                  <ThemedText style={styles.oddsValue}>
                    O: {formatOdds(item.overUnder.overOdds)} | U: {formatOdds(item.overUnder.underOdds)}
                  </ThemedText>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderTeam = (team: Team) => {
    return (
      <TouchableOpacity 
        key={team.id} 
        style={[styles.teamCard, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}
      >
        <View style={styles.teamRow}>
          <View style={styles.teamInfo}>
            <Image source={{ uri: team.logo }} style={styles.teamLogo} />
            <View style={styles.teamDetails}>
              <ThemedText style={styles.teamName}>{team.displayName}</ThemedText>
              <ThemedText style={styles.teamAbbreviation}>{team.abbreviation}</ThemedText>
            </View>
          </View>
          <View style={styles.teamStats}>
            {team.record && (
              <ThemedText style={styles.recordText}>
                {team.record.wins}-{team.record.losses}
              </ThemedText>
            )}
            {team.conference && (
              <ThemedText style={styles.conferenceText}>
                {team.conference} {team.standing?.conferenceRank ? `#${team.standing.conferenceRank}` : ''}
              </ThemedText>
            )}
          </View>
        </View>
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
        <ThemedText style={styles.title}>NBA Hub</ThemedText>
        <ThemedText style={styles.subtitle}>
          {activeTab === 'teams' ? '2024-25 Season' : 'Today\'s Games'}
        </ThemedText>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'teams' && styles.activeTab]}
          onPress={() => setActiveTab('teams')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'teams' && styles.activeTabText]}>
            Teams ({teams.length})
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'games' && styles.activeTab]}
          onPress={() => setActiveTab('games')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'games' && styles.activeTabText]}>
            Today&apos;s Games ({todaysGames.length})
          </ThemedText>
        </TouchableOpacity>
      </View>
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'teams' ? (
          teams.length > 0 ? (
            teams.map(renderTeam)
          ) : (
            <View style={styles.noDataContainer}>
              <ThemedText style={styles.noDataText}>No teams available</ThemedText>
            </View>
          )
        ) : (
          gamesLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} />
              <ThemedText style={styles.loadingText}>Loading today&apos;s games...</ThemedText>
            </View>
          ) : todaysGames.length > 0 ? (
            <FlatList
              data={todaysGames}
              renderItem={renderGameCard}
              keyExtractor={(item) => item.gameId}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.noDataContainer}>
              <ThemedText style={styles.noDataText}>No games scheduled for today</ThemedText>
            </View>
          )
        )}
      </ScrollView>
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
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 10,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: Colors.light.tint,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: 'white',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  // Team Card Styles
  teamCard: {
    marginBottom: 12,
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
  },
  teamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  teamLogo: {
    width: 40,
    height: 40,
    marginRight: 12,
    resizeMode: 'contain',
  },
  teamDetails: {
    flex: 1,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '600',
  },
  teamAbbreviation: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 2,
  },
  teamStats: {
    alignItems: 'flex-end',
  },
  recordText: {
    fontSize: 16,
    fontWeight: '500',
  },
  conferenceText: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 2,
  },
  // Game Card Styles
  gameCard: {
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
  },
  gameStatusHeader: {
    alignItems: 'center',
    marginBottom: 15,
  },
  gameStatusText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  teamsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  teamSection: {
    flex: 1,
    alignItems: 'center',
  },
  score: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
    color: Colors.light.tint,
  },
  vsText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 15,
    opacity: 0.6,
  },
  teamTricode: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 2,
  },
  // Odds Styles
  oddsContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    paddingTop: 15,
  },
  oddsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  oddsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  oddsStat: {
    alignItems: 'center',
    flex: 1,
  },
  oddsLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
    opacity: 0.8,
  },
  oddsValue: {
    fontSize: 11,
    opacity: 0.7,
    textAlign: 'center',
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  noDataText: {
    fontSize: 18,
    opacity: 0.7,
  },
});