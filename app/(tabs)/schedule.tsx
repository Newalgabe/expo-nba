import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator, // Added
    Image,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

interface ESPNTeam {
  id: string;
  displayName: string;
  shortDisplayName: string;
  abbreviation: string;
  logo: string;
  // For detailed view, API might provide more like color, alternateColor
  color?: string;
  alternateColor?: string;
}

interface ESPNCompetitor {
  id: string;
  team: ESPNTeam;
  homeAway: string;
  score: string;
  // other competitor fields if needed
}

interface ESPNGameStatus {
  type: {
    id: string;
    name: string;
    state: string; // e.g., "pre", "in", "post"
    completed: boolean;
    description: string; // e.g., "Scheduled", "Final", "In Progress"
    detail: string; // e.g., "Thu, Aug 29, 10:00 PM ET" or "Final"
    shortDetail: string; // e.g., "10:00 PM ET" or "Final"
  };
}

interface ESPNGame {
  id: string;
  date: string;
  name: string;
  shortName: string;
  status: ESPNGameStatus;
  competitions: Array<{
    id: string;
    competitors: ESPNCompetitor[];
    status: ESPNGameStatus; // Sometimes competition status can differ slightly
    venue?: { // Added for modal, if available in scoreboard
      fullName?: string;
      address?: { city?: string; state?: string };
    };
    broadcasts?: Array<{ // Added for modal
        market: string;
        names: string[];
    }>;
  }>;
}

interface GroupedGame {
  date: string;
  games: ESPNGame[];
}

// Interface for detailed game data from summary endpoint
interface DetailedGameAthlete {
  athlete: {
    id: string;
    displayName: string;
    jersey?: string;
    position?: { abbreviation: string };
    headshot?: string; // URL to player's headshot
  };
  stats: string[]; // Array of stat values corresponding to labels
  starter: boolean;
  active: boolean; // Whether the player is active for the game
}

interface DetailedGamePlayerTeamStats {
  team: ESPNTeam; // Re-using ESPNTeam, but API might have slightly different structure here
  statistics: Array<{
    // This usually has one entry with type 'total' or similar
    labels: string[]; // e.g., ["MIN", "FGM-A", "FG%", "3PM-A", "3P%", "FTM-A", "FT%", "REB", "AST", "STL", "BLK", "TO", "PF", "+/-", "PTS"]
    athletes: DetailedGameAthlete[];
  }>;
}

interface DetailedTeamStats {
    team: ESPNTeam;
    statistics: Array<{ name: string; displayValue: string; label: string }>;
}

interface DetailedGameData {
  boxscore: {
    players: DetailedGamePlayerTeamStats[];
    teams: DetailedTeamStats[];
  };
  gameInfo: {
    venue?: {
      fullName?: string;
      address?: { city?: string; state?: string };
    };
    attendance?: number;
  };
  header: ESPNGame; // The full game object, often includes original scoreboard data
  leaders?: Array<{ /* ... structure for game leaders ... */ }>;
  broadcasts?: Array<{ market: string; names: string[] }>;
  // ... other fields from summary API like 'predictor', 'plays', 'standings'
}


export default function ScheduleScreen() {
  const [schedule, setSchedule] = useState<GroupedGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const colorScheme = useColorScheme();

  // State for Modal and Detailed Game Info
  const [selectedGameForDetail, setSelectedGameForDetail] = useState<ESPNGame | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [detailedGameData, setDetailedGameData] = useState<DetailedGameData | null>(null);
  const [isLoadingGameDetails, setIsLoadingGameDetails] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const fetchSchedule = async () => {
    try {
      setError(null);
      setLoading(true); // Set loading true at the start of fetch

      const dates = [];
      const today = new Date();
      const D_PAST = 2; // Number of past days to show
      const D_FUTURE = 5; // Number of future days (includes today, so today + 4 more)

      for (let i = -D_PAST; i < D_FUTURE; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        dates.push(date.toISOString().split('T')[0].replace(/-/g, ''));
      }

      const allGames: ESPNGame[] = [];

      for (const dateStr of dates) {
        try {
          const response = await axios.get<{ events: ESPNGame[] }>(
            `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${dateStr}`
          );
          if (response.data?.events) {
            allGames.push(...response.data.events);
          }
        } catch (dateError) {
          console.log(`No games found for date ${dateStr} or API error for this date.`);
        }
      }

      const groupedGames: { [key: string]: ESPNGame[] } = {};
      allGames.forEach(game => {
        const gameDate = new Date(game.date).toDateString();
        if (!groupedGames[gameDate]) {
          groupedGames[gameDate] = [];
        }
        groupedGames[gameDate].push(game);
      });

      const scheduleArray: GroupedGame[] = Object.entries(groupedGames)
        .map(([date, games]) => ({
          date,
          games: games.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setSchedule(scheduleArray);
    } catch (e) {
      console.error('Error fetching schedule:', e);
      setError('Failed to load schedule. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSchedule();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: ESPNGameStatus['type']) => {
    if (status.completed) return '#34C759'; // Green
    if (status.state === 'in') return '#FF3B30'; // Red
    return '#007AFF'; // Blue
  };

  const handleGamePress = async (game: ESPNGame) => {
    setSelectedGameForDetail(game);
    setIsDetailModalVisible(true);
    setDetailedGameData(null);
    setDetailError(null);
    setIsLoadingGameDetails(true);

    try {
      const response = await axios.get<DetailedGameData>(
        `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${game.id}`
      );
      setDetailedGameData(response.data);
    } catch (err) {
      console.error('Error fetching game details:', err);
      setDetailError('Failed to load game details. This game might not have detailed data available yet or an error occurred.');
    } finally {
      setIsLoadingGameDetails(false);
    }
  };

  const renderGame = (game: ESPNGame) => {
    const competition = game.competitions[0];
    const homeTeam = competition.competitors.find(c => c.homeAway === 'home');
    const awayTeam = competition.competitors.find(c => c.homeAway === 'away');

    return (
      <TouchableOpacity
        key={game.id}
        style={[styles.gameCard, { backgroundColor: Colors[colorScheme ?? 'light'].card }]}
        onPress={() => handleGamePress(game)}
      >
        <View style={styles.gameHeader}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(game.status.type) }]}>
            <ThemedText style={styles.statusTextWhite}>
              {game.status.type.shortDetail}
            </ThemedText>
          </View>
          <ThemedText type="defaultSemiBold" style={styles.gameTime}>
            {game.status.type.state === 'pre' ? formatTime(game.date) : game.status.type.description}
          </ThemedText>
        </View>
        
        <View style={styles.teamsContainer}>
          {/* Away Team */}
          <View style={styles.teamRow}>
            <View style={styles.teamInfo}>
              {awayTeam?.team.logo ? (
                <Image source={{ uri: awayTeam.team.logo }} style={styles.teamLogoList} />
              ) : (
                <View style={styles.teamLogoPlaceholder}>
                  <ThemedText style={styles.teamTricode}>
                    {awayTeam?.team.abbreviation || 'TBD'}
                  </ThemedText>
                </View>
              )}
              <ThemedText type="subtitle" style={styles.teamName} numberOfLines={1}>
                {awayTeam?.team.displayName || 'TBD'}
              </ThemedText>
            </View>
            {awayTeam?.score && (
              <ThemedText type="title" style={styles.score}>{awayTeam.score}</ThemedText>
            )}
          </View>
          
          <ThemedText style={styles.vsText}>
            {game.status.type.completed ? 'Final Score' : (game.status.type.state === 'in' ? 'Live' : '@')}
          </ThemedText>
          
          {/* Home Team */}
          <View style={styles.teamRow}>
            <View style={styles.teamInfo}>
              {homeTeam?.team.logo ? (
                <Image source={{ uri: homeTeam.team.logo }} style={styles.teamLogoList} />
              ) : (
                <View style={styles.teamLogoPlaceholder}>
                  <ThemedText style={styles.teamTricode}>
                    {homeTeam?.team.abbreviation || 'TBD'}
                  </ThemedText>
                </View>
              )}
              <ThemedText type="subtitle" style={styles.teamName} numberOfLines={1}>
                {homeTeam?.team.displayName || 'TBD'}
              </ThemedText>
            </View>
            {homeTeam?.score && (
              <ThemedText type="title" style={styles.score}>{homeTeam.score}</ThemedText>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderGameDate = (groupedGame: GroupedGame) => {
    if (!groupedGame.games || groupedGame.games.length === 0) {
      return null;
    }
    return (
      <View key={groupedGame.date} style={styles.dateSection}>
        <View style={styles.dateHeaderContainer}>
          <ThemedText type="title" style={styles.dateText}>
            {formatDate(groupedGame.date)}
          </ThemedText>
          <ThemedText style={styles.gamesCount}>
            {groupedGame.games.length} game{groupedGame.games.length !== 1 ? 's' : ''}
          </ThemedText>
        </View>
        {groupedGame.games.map(renderGame)}
      </View>
    );
  };

  const renderDetailModalContent = () => {
    if (!selectedGameForDetail) return null;

    const gameToDisplay = detailedGameData?.header || selectedGameForDetail;

    if (!gameToDisplay) {
        return (
            <View style={[styles.modalContainer, styles.centerContent]}>
                <ThemedText style={styles.modalErrorText}>Error: Essential game data is missing.</ThemedText>
          <TouchableOpacity 
            style={[styles.modalCloseButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]} 
            onPress={() => setIsDetailModalVisible(false)}
          >
                   <ThemedText style={styles.modalCloseButtonText}>Close</ThemedText>
                </TouchableOpacity>
            </View>
        );
    }

    const competition = gameToDisplay.competitions?.[0];
    const homeTeamBasic = competition?.competitors?.find(c => c.homeAway === 'home')?.team;
    const awayTeamBasic = competition?.competitors?.find(c => c.homeAway === 'away')?.team;

    return (
      <ScrollView 
        style={styles.modalScrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={styles.modalHeader}>
            <ThemedText type="title" style={styles.modalTeamNameBig}>
            {awayTeamBasic?.shortDisplayName || (selectedGameForDetail.competitions[0].competitors.find(c => c.homeAway === 'away')?.team.shortDisplayName || 'Away')}
            </ThemedText>
            <ThemedText type="defaultSemiBold" style={styles.modalVersus}>vs</ThemedText>
            <ThemedText type="title" style={styles.modalTeamNameBig}>
            {homeTeamBasic?.shortDisplayName || (selectedGameForDetail.competitions[0].competitors.find(c => c.homeAway === 'home')?.team.shortDisplayName || 'Home')}
            </ThemedText>
        </View>
        <ThemedText style={styles.modalGameTime}>
          {gameToDisplay.date ? formatDate(gameToDisplay.date) : 'Date N/A'} -
          {gameToDisplay.status?.type?.state === 'pre' && gameToDisplay.date
            ? formatTime(gameToDisplay.date)
            : (gameToDisplay.status?.type?.description || 'Status Unavailable')}
        </ThemedText>

        {isLoadingGameDetails && (
          <View style={styles.modalLoadingContainer}>
            <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} />
            <ThemedText style={{marginTop: 10}}>Loading game details...</ThemedText>
          </View>
        )}
        {detailError && <ThemedText style={styles.modalErrorText}>{detailError}</ThemedText>}

        {detailedGameData && (
          <>
            {/* Game Info Section */}
            <ThemedText type="subtitle" style={styles.modalSectionTitle}>Game Information</ThemedText>
            {(detailedGameData.gameInfo?.venue?.fullName || detailedGameData.gameInfo?.venue?.address?.city || detailedGameData.gameInfo?.attendance || detailedGameData.broadcasts?.length) ? (
              <>
                {detailedGameData.gameInfo?.venue?.fullName && (
                  <ThemedText style={styles.modalInfoText}>Venue: {detailedGameData.gameInfo.venue.fullName}</ThemedText>
                )}
                {detailedGameData.gameInfo?.venue?.address?.city && detailedGameData.gameInfo?.venue?.address?.state && (
                  <ThemedText style={styles.modalInfoText}>Location: {detailedGameData.gameInfo.venue.address.city}, {detailedGameData.gameInfo.venue.address.state}</ThemedText>
                )}
                {detailedGameData.gameInfo?.attendance && (
                  <ThemedText style={styles.modalInfoText}>Attendance: {detailedGameData.gameInfo.attendance.toLocaleString()}</ThemedText>
                )}
                {/* CORRECTED BROADCAST SECTION */}
                {detailedGameData.broadcasts && detailedGameData.broadcasts.length > 0 && (
                  <ThemedText style={styles.modalInfoText}>
                    Broadcast: {
                      detailedGameData.broadcasts
                        .map(b => {
                          if (Array.isArray(b.names) && b.names.length > 0) {
                            return b.names.join(', ');
                          }
                          return null; 
                        })
                        .filter(nameString => nameString !== null)
                        .join('; ') || 'N/A'
                    }
                  </ThemedText>
                )}
              </>
            ) : (
              <ThemedText style={styles.modalInfoText}>Detailed game information not available for this match.</ThemedText>
            )}


            {/* Lineups Section */}
            {(detailedGameData.boxscore?.players && detailedGameData.boxscore.players.length > 0 && detailedGameData.boxscore.players.some(tp => tp.statistics?.[0]?.athletes?.length > 0)) ? (
                <>
                <ThemedText type="subtitle" style={styles.modalSectionTitle}>Lineups</ThemedText>
                {detailedGameData.boxscore.players.map(teamPlayers => (
                  (teamPlayers.statistics?.[0]?.athletes?.length > 0) && 
                    <View key={teamPlayers.team.id} style={styles.lineupTeamContainer}>
                        <View style={styles.lineupTeamHeader}>
                            {teamPlayers.team.logo && <Image source={{uri: teamPlayers.team.logo}} style={styles.modalTeamLogoSmall} />}
                            <ThemedText type="defaultSemiBold" style={styles.lineupTeamName}>{teamPlayers.team.displayName}</ThemedText>
                        </View>
                        
                        <ThemedText style={styles.lineupSubheader}>Starters:</ThemedText>
                        {teamPlayers.statistics[0]?.athletes.filter(p => p.starter && p.active).map(player => (
                        <ThemedText key={player.athlete.id} style={styles.playerText}>
                            {player.athlete.jersey ? `#${player.athlete.jersey} ` : ''}
                            {player.athlete.displayName} {player.athlete.position ? `(${player.athlete.position.abbreviation})` : ''}
                        </ThemedText>
                        ))}
                        {teamPlayers.statistics[0]?.athletes.filter(p => p.starter && p.active).length === 0 && <ThemedText style={styles.playerText}>Not yet available.</ThemedText>}

                        <ThemedText style={styles.lineupSubheader}>Bench:</ThemedText>
                        {teamPlayers.statistics[0]?.athletes.filter(p => !p.starter && p.active).map(player => (
                        <ThemedText key={player.athlete.id} style={styles.playerText}>
                            {player.athlete.jersey ? `#${player.athlete.jersey} ` : ''}
                            {player.athlete.displayName} {player.athlete.position ? `(${player.athlete.position.abbreviation})` : ''}
                        </ThemedText>
                        ))}
                        {teamPlayers.statistics[0]?.athletes.filter(p => !p.starter && p.active).length === 0 && <ThemedText style={styles.playerText}>Not yet available or no bench players listed.</ThemedText>}
                        
                        {teamPlayers.statistics[0]?.athletes.filter(p => !p.active).length > 0 && (
                            <>
                            <ThemedText style={styles.lineupSubheader}>Inactive/DNP:</ThemedText>
                            {teamPlayers.statistics[0]?.athletes.filter(p => !p.active).map(player => (
                            <ThemedText key={player.athlete.id} style={styles.playerTextInactive}>
                                {player.athlete.jersey ? `#${player.athlete.jersey} ` : ''}
                                {player.athlete.displayName} {player.athlete.position ? `(${player.athlete.position.abbreviation})` : ''}
                            </ThemedText>
                            ))}
                            </>
                        )}
                    </View>
                ))}
                </>
            ) : (
                 gameToDisplay.status?.type?.state !== 'pre' && 
                <ThemedText type="subtitle" style={styles.modalSectionTitle}>Lineups not yet available</ThemedText>
            )}

            {/* Team Stats Section */}
            {(detailedGameData.boxscore?.teams && detailedGameData.boxscore.teams.length > 0 && detailedGameData.boxscore.teams.some(ts => ts.statistics?.length > 0)) ? (
                <>
                <ThemedText type="subtitle" style={styles.modalSectionTitle}>Team Statistics</ThemedText>
                {detailedGameData.boxscore.teams.map(teamBoxScore => (
                  (teamBoxScore.statistics?.length > 0) && 
                    <View 
                      key={teamBoxScore.team.id} 
                      style={[
                        styles.teamStatsContainer,
                        { 
                          backgroundColor: Colors[colorScheme ?? 'light'].card,
                          borderColor: Colors[colorScheme ?? 'light'].border
                        }
                      ]}
                    >
                        <View style={styles.lineupTeamHeader}>
                            {teamBoxScore.team.logo && <Image source={{uri: teamBoxScore.team.logo}} style={styles.modalTeamLogoSmall} />}
                            <ThemedText type="defaultSemiBold" style={styles.lineupTeamName}>{teamBoxScore.team.displayName}</ThemedText>
                        </View>
                        {teamBoxScore.statistics.map(stat => (
                        <View 
                          key={stat.name} 
                          style={[
                            styles.statRow,
                            { borderBottomColor: Colors[colorScheme ?? 'light'].border }
                          ]}
                        >
                            <ThemedText style={styles.statLabel}>{stat.label}:</ThemedText>
                            <ThemedText style={styles.statValue}>{stat.displayValue}</ThemedText>
                        </View>
                        ))}
                    </View>
                ))}
                </>
            ) : (
                 gameToDisplay.status?.type?.state !== 'pre' && 
                 <ThemedText type="subtitle" style={styles.modalSectionTitle}>Team Statistics not yet available</ThemedText>
            )}
          </>
        )}
        <TouchableOpacity 
          style={[styles.modalCloseButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]} 
          onPress={() => setIsDetailModalVisible(false)}
        >
           <ThemedText style={styles.modalCloseButtonText}>Close</ThemedText>
        </TouchableOpacity>
      </ScrollView>
    );
  };


  if (loading) {
    return (
      <ThemedView style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} />
        <ThemedText style={styles.loadingText}>Loading schedule...</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={[styles.container, styles.centerContent]}>
         <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>NBA Schedule</ThemedText>
            <ThemedText type="default" style={styles.subtitle}>Recent & Upcoming Games</ThemedText>
        </View>
        <ThemedText style={styles.errorText}>{error}</ThemedText>
        <TouchableOpacity style={styles.retryButton} onPress={fetchSchedule}>
            <ThemedText style={styles.retryText}>Retry</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>NBA Schedule</ThemedText>
        <ThemedText type="default" style={styles.subtitle}>Recent & Upcoming Games</ThemedText>
      </View>
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors[colorScheme ?? 'light'].tint} />
        }
        showsVerticalScrollIndicator={false}
      >
        {schedule.length > 0 ? (
          schedule.map(renderGameDate)
        ) : (
          <View style={styles.noGamesContainer}>
            <ThemedText style={styles.noGamesText}>No games found for the selected period.</ThemedText>
             <ThemedText style={styles.noGamesSubText}>Pull down to refresh or try again later.</ThemedText>
            <TouchableOpacity style={styles.retryButton} onPress={fetchSchedule}>
              <ThemedText style={styles.retryText}>Refresh Now</ThemedText>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={false} // Using a non-transparent modal for better focus
        visible={isDetailModalVisible}
        onRequestClose={() => {
          setIsDetailModalVisible(false);
        }}
      >
        <ThemedView style={styles.modalContainer}>
          {/* A small header for the modal itself could go here if needed */}
          {renderDetailModalContent()}
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // paddingTop: 50, // Removed, header provides padding
  },
  centerContent: { // For loading/error states
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 30, // Adjusted
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.8, // Adjusted
    marginTop: 4, // Adjusted
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 15, // Adjusted
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.7,
    color: 'red',
  },
  retryButton: {
    backgroundColor: Colors.light.tint, // Use theme color
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2,
  },
  retryText: {
    color: '#FFFFFF', // White text on tint background
    fontWeight: '600',
    fontSize: 16,
  },
  dateSection: {
    marginTop: 20, // Added margin for first section
    marginBottom: 15, // Adjusted
  },
  dateHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12, // Adjusted
    paddingBottom: 8, // Adjusted
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.2)', // Softer border
  },
  dateText: {
    fontSize: 20, // Adjusted from type="title"
    fontWeight: 'bold',
  },
  gamesCount: {
    fontSize: 14,
    opacity: 0.7,
  },
  gameCard: {
    marginBottom: 15, // Adjusted
    padding: 15,
    borderRadius: 12,
    // backgroundColor is set dynamically by Colors[colorScheme].card
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, // Softer shadow
    shadowRadius: 3,
    elevation: 3,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12, // Adjusted
  },
  statusBadge: {
    paddingHorizontal: 10, // Adjusted
    paddingVertical: 5, // Adjusted
    borderRadius: 15, // More rounded
  },
  statusTextWhite: { // Renamed for clarity
    fontSize: 12,
    color: 'white',
    fontWeight: 'bold', // Make it bold
  },
  gameTime: {
    fontSize: 13, // Adjusted
    fontWeight: '500',
  },
  teamsContainer: {
    // alignItems: 'center', // Removed, teamRows handle alignment
  },
  teamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8, // Adjusted
  },
  teamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1, // Allow team name to take space
    marginRight: 10, // Space before score
  },
  teamLogoList: { // Renamed for clarity
    width: 36, // Adjusted
    height: 36, // Adjusted
    borderRadius: 18,
    marginRight: 10, // Adjusted
    resizeMode: 'contain',
    backgroundColor: '#f0f0f0', // Placeholder bg for transparent logos
  },
  teamLogoPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e0e0e0', // Softer placeholder
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  teamTricode: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#555', // Darker text for placeholder
  },
  teamName: {
    fontSize: 17, // Adjusted from type="subtitle"
    fontWeight: '500',
    flexShrink: 1, // Ensure name shrinks if too long
  },
  score: {
    fontSize: 20, // Adjusted from type="title"
    fontWeight: 'bold',
    minWidth: 40, // Ensure space for scores
    textAlign: 'right',
  },
  vsText: {
    fontSize: 13, // Adjusted
    opacity: 0.6, // Adjusted
    fontWeight: '500', // Adjusted
    textAlign: 'center',
    marginVertical: 3, // Adjusted
  },
  noGamesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80, // Give it some vertical space
    paddingHorizontal: 20,
  },
  noGamesText: {
    fontSize: 18,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 8,
  },
  noGamesSubText: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
    marginBottom: 20,
  },
  // --- Modal Styles ---
  modalContainer: {
    flex: 1,
    paddingTop: 50, // Adjust for status bar, or use SafeAreaView
  },
  modalScrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTeamNameBig: {
    fontSize: 22, // type="title"
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalVersus: {
    fontSize: 16, // type="defaultSemiBold"
    marginHorizontal: 10,
    opacity: 0.8,
  },
  modalGameTime: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 18, // type="subtitle"
    fontWeight: 'bold',
    marginTop: 25,
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  modalInfoText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 5,
  },
  modalLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  modalErrorText: {
    color: 'red',
    textAlign: 'center',
    marginVertical: 20,
    fontSize: 15,
  },
  lineupTeamContainer: {
    marginBottom: 20,
  },
  lineupTeamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTeamLogoSmall: {
    width: 30,
    height: 30,
    marginRight: 10,
    resizeMode: 'contain',
  },
  lineupTeamName: {
    fontSize: 18,
    fontWeight: '600',
  },
  lineupSubheader: {
    fontSize: 15,
    fontWeight: '500',
    color: '#444',
    marginTop: 10,
    marginBottom: 5,
  },
  playerText: {
    fontSize: 14,
    marginLeft: 10,
    lineHeight: 20,
    marginBottom: 3,
  },
  playerTextInactive: {
    fontSize: 14,
    marginLeft: 10,
    lineHeight: 20,
    opacity: 0.6,
    fontStyle: 'italic',
    marginBottom: 3,
  },
  teamStatsContainer: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  statLabel: {
    fontSize: 14,
    opacity: 0.8,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalCloseButton: {
    marginTop: 30,
    // marginBottom handled by ScrollView contentContainerStyle
    backgroundColor: Colors.light.tint, // Use theme color
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
  },
  modalCloseButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});