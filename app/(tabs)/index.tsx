import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View
} from 'react-native';

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
  sr_id: string;
  srMatchId: string;
  homeTeamId: string;
  awayTeamId: string;
  markets: {
    name: string;
    odds_type_id: number;
    group_name: string;
    books: {
      id: string;
      name: string;
      outcomes: {
        odds_field_id: number;
        type: string;
        odds: string;
        opening_odds: string;
        odds_trend: string;
        spread?: string;
        opening_spread?: number;
      }[];
      url: string;
      countryCode: string;
    }[];
  }[];
}

interface TransformedGame {
  gameId: string;
  gameDate: string;
  gameTime: string;
  homeTeam: {
    teamId: string;
    teamName: string;
    teamTricode: string;
    teamCity: string;
    teamLogo?: string;
  };
  awayTeam: {
    teamId: string;
    teamName: string;
    teamTricode: string;
    teamCity: string;
    teamLogo?: string;
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
  moneyLine?: {
    homeTeamOdds: number;
    awayTeamOdds: number;
  };
  overUnder?: {
    total: number;
    overOdds: number;
    underOdds: number;
  };
}

interface ApiResponse {
  teams: Team[];
}

interface TodaysGamesResponse {
  games: GameOdds[];
}

// NBA Team mapping
const NBA_TEAMS: { [key: string]: { name: string; city: string; tricode: string } } = {
  '1610612737': { name: 'Hawks', city: 'Atlanta', tricode: 'ATL' },
  '1610612738': { name: 'Celtics', city: 'Boston', tricode: 'BOS' },
  '1610612751': { name: 'Nets', city: 'Brooklyn', tricode: 'BKN' },
  '1610612766': { name: 'Hornets', city: 'Charlotte', tricode: 'CHA' },
  '1610612741': { name: 'Bulls', city: 'Chicago', tricode: 'CHI' },
  '1610612739': { name: 'Cavaliers', city: 'Cleveland', tricode: 'CLE' },
  '1610612742': { name: 'Mavericks', city: 'Dallas', tricode: 'DAL' },
  '1610612743': { name: 'Nuggets', city: 'Denver', tricode: 'DEN' },
  '1610612765': { name: 'Pistons', city: 'Detroit', tricode: 'DET' },
  '1610612744': { name: 'Warriors', city: 'Golden State', tricode: 'GSW' },
  '1610612745': { name: 'Rockets', city: 'Houston', tricode: 'HOU' },
  '1610612754': { name: 'Pacers', city: 'Indiana', tricode: 'IND' },
  '1610612746': { name: 'Clippers', city: 'LA', tricode: 'LAC' },
  '1610612747': { name: 'Lakers', city: 'Los Angeles', tricode: 'LAL' },
  '1610612763': { name: 'Grizzlies', city: 'Memphis', tricode: 'MEM' },
  '1610612748': { name: 'Heat', city: 'Miami', tricode: 'MIA' },
  '1610612749': { name: 'Bucks', city: 'Milwaukee', tricode: 'MIL' },
  '1610612750': { name: 'Timberwolves', city: 'Minnesota', tricode: 'MIN' },
  '1610612740': { name: 'Pelicans', city: 'New Orleans', tricode: 'NOP' },
  '1610612752': { name: 'Knicks', city: 'New York', tricode: 'NYK' },
  '1610612760': { name: 'Thunder', city: 'Oklahoma City', tricode: 'OKC' },
  '1610612753': { name: 'Magic', city: 'Orlando', tricode: 'ORL' },
  '1610612755': { name: '76ers', city: 'Philadelphia', tricode: 'PHI' },
  '1610612756': { name: 'Suns', city: 'Phoenix', tricode: 'PHX' },
  '1610612757': { name: 'Trail Blazers', city: 'Portland', tricode: 'POR' },
  '1610612758': { name: 'Kings', city: 'Sacramento', tricode: 'SAC' },
  '1610612759': { name: 'Spurs', city: 'San Antonio', tricode: 'SAS' },
  '1610612761': { name: 'Raptors', city: 'Toronto', tricode: 'TOR' },
  '1610612762': { name: 'Jazz', city: 'Utah', tricode: 'UTA' },
  '1610612764': { name: 'Wizards', city: 'Washington', tricode: 'WAS' }
};

export default function TeamsScreen() {
  const [todaysGames, setTodaysGames] = useState<TransformedGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();

  const fetchTodaysGames = async () => {
    try {
      const response = await axios.get<TodaysGamesResponse>(
        'http://localhost:3000/api/nba/games'
      );
      
      // Transform the data to match our UI needs
      const transformedGames = response.data.games.map((game: GameOdds) => {
        // Find the moneyline market (2way)
        const moneylineMarket = game.markets.find((m: { name: string }) => m.name === '2way');
        // Find the spread market
        const spreadMarket = game.markets.find((m: { name: string }) => m.name === 'spread');
        // Find the totals market
        const totalsMarket = game.markets.find((m: { name: string }) => m.name === 'totals');
        
        // Get FanDuel odds (or first available book)
        const moneylineBook = moneylineMarket?.books[0];
        const spreadBook = spreadMarket?.books[0];
        const totalsBook = totalsMarket?.books[0];

        const homeTeamInfo = NBA_TEAMS[game.homeTeamId] || { name: 'Unknown', city: 'Unknown', tricode: 'UNK' };
        const awayTeamInfo = NBA_TEAMS[game.awayTeamId] || { name: 'Unknown', city: 'Unknown', tricode: 'UNK' };

        return {
          gameId: game.gameId,
          gameDate: new Date().toISOString().split('T')[0],
          gameTime: '19:30', // Default time, should be updated with actual game time
          homeTeam: {
            teamId: game.homeTeamId,
            teamName: homeTeamInfo.name,
            teamTricode: homeTeamInfo.tricode,
            teamCity: homeTeamInfo.city,
            teamLogo: `https://cdn.nba.com/logos/nba/${game.homeTeamId}/primary/L/logo.svg`
          },
          awayTeam: {
            teamId: game.awayTeamId,
            teamName: awayTeamInfo.name,
            teamTricode: awayTeamInfo.tricode,
            teamCity: awayTeamInfo.city,
            teamLogo: `https://cdn.nba.com/logos/nba/${game.awayTeamId}/primary/L/logo.svg`
          },
          gameStatus: '1', // Default to upcoming
          gameStatusText: 'Upcoming',
          period: 0,
          gameClock: '',
          moneyLine: moneylineBook ? {
            homeTeamOdds: parseFloat(moneylineBook.outcomes.find((o: { type: string }) => o.type === 'home')?.odds || '0'),
            awayTeamOdds: parseFloat(moneylineBook.outcomes.find((o: { type: string }) => o.type === 'away')?.odds || '0'),
          } : undefined,
          pointSpread: spreadBook ? {
            homeTeamOdds: {
              pointSpread: parseFloat(spreadBook.outcomes.find((o: { type: string }) => o.type === 'home')?.spread || '0'),
              pointSpreadOdds: parseFloat(spreadBook.outcomes.find((o: { type: string }) => o.type === 'home')?.odds || '0'),
            },
            awayTeamOdds: {
              pointSpread: parseFloat(spreadBook.outcomes.find((o: { type: string }) => o.type === 'away')?.spread || '0'),
              pointSpreadOdds: parseFloat(spreadBook.outcomes.find((o: { type: string }) => o.type === 'away')?.odds || '0'),
            },
          } : undefined,
          overUnder: totalsBook ? {
            total: parseFloat(totalsBook.outcomes.find((o: { type: string }) => o.type === 'over')?.spread || '0'),
            overOdds: parseFloat(totalsBook.outcomes.find((o: { type: string }) => o.type === 'over')?.odds || '0'),
            underOdds: parseFloat(totalsBook.outcomes.find((o: { type: string }) => o.type === 'under')?.odds || '0'),
          } : undefined,
        };
      });
      
      setTodaysGames(transformedGames);
    } catch (error) {
      console.error('Error fetching today\'s games:', error);
      setTodaysGames([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodaysGames();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTodaysGames().finally(() => {
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

  const renderGameCard = ({ item }: { item: TransformedGame }) => {
    const isLive = item.gameStatus === '2';
    const isCompleted = item.gameStatus === '3';
    const isUpcoming = item.gameStatus === '1';

    // Provide fallback values for missing team data
    const homeTeam = item.homeTeam || {
      teamId: 'unknown',
      teamName: 'Unknown',
      teamTricode: 'UNK',
      teamCity: 'Unknown',
      teamLogo: null
    };
    
    const awayTeam = item.awayTeam || {
      teamId: 'unknown',
      teamName: 'Unknown', 
      teamTricode: 'UNK',
      teamCity: 'Unknown',
      teamLogo: null
    };

    // Generate team logo URLs if not provided
    const homeTeamLogo = homeTeam.teamLogo || `https://cdn.nba.com/logos/nba/${homeTeam.teamId}/primary/L/logo.svg`;
    const awayTeamLogo = awayTeam.teamLogo || `https://cdn.nba.com/logos/nba/${awayTeam.teamId}/primary/L/logo.svg`;

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
                source={{ uri: awayTeamLogo }} 
                style={styles.teamLogo} 
                resizeMode="contain"
              />
              <View>
                <ThemedText style={styles.teamName}>
                  {awayTeam.teamCity} {awayTeam.teamName}
                </ThemedText>
                <ThemedText style={styles.teamTricode}>
                  {awayTeam.teamTricode}
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
                source={{ uri: homeTeamLogo }} 
                style={styles.teamLogo} 
                resizeMode="contain"
              />
              <View>
                <ThemedText style={styles.teamName}>
                  {homeTeam.teamCity} {homeTeam.teamName}
                </ThemedText>
                <ThemedText style={styles.teamTricode}>
                  {homeTeam.teamTricode}
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
                    {awayTeam.teamTricode}: {item.pointSpread.awayTeamOdds.pointSpread > 0 ? '+' : ''}{item.pointSpread.awayTeamOdds.pointSpread}
                  </ThemedText>
                  <ThemedText style={styles.oddsValue}>
                    {homeTeam.teamTricode}: {item.pointSpread.homeTeamOdds.pointSpread > 0 ? '+' : ''}{item.pointSpread.homeTeamOdds.pointSpread}
                  </ThemedText>
                </View>
              )}

              {/* Money Line */}
              {item.moneyLine && (
                <View style={styles.oddsStat}>
                  <ThemedText style={styles.oddsLabel}>Money Line</ThemedText>
                  <ThemedText style={styles.oddsValue}>
                    {awayTeam.teamTricode}: {formatOdds(item.moneyLine.awayTeamOdds)}
                  </ThemedText>
                  <ThemedText style={styles.oddsValue}>
                    {homeTeam.teamTricode}: {formatOdds(item.moneyLine.homeTeamOdds)}
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

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} />
          <ThemedText style={styles.loadingText}>Loading today&apos;s games...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>NBA Games</ThemedText>
        <ThemedText style={styles.subtitle}>Today&apos;s Matchups</ThemedText>
      </View>
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {todaysGames.length > 0 ? (
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
  teamName: {
    fontSize: 16,
    fontWeight: '600',
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