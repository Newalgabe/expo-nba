import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import axios from 'axios';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/ui/IconSymbol';

interface TeamDetails {
  id: string;
  displayName: string;
  abbreviation: string;
  location: string;
  name: string;
  logos: Array<{
    href: string;
  }>;
  color: string;
  alternateColor: string;
  record?: {
    items: Array<{
      summary: string;
      stats: Array<{
        name: string;
        value: number;
      }>;
    }>;
  };
  venue?: {
    fullName: string;
    address: {
      city: string;
      state: string;
    };
  };
  leaders?: Array<{
    name: string;
    displayName: string;
    leaders: Array<{
      athlete: {
        displayName: string;
      };
      value: number;
    }>;
  }>;
}

interface Game {
  id: string;
  date: string;
  name: string;
  status: {
    type: {
      state: string;
      completed: boolean;
      description: string;
      detail: string;
    };
  };
  competitions: Array<{
    competitors: Array<{
      homeAway: string;
      team: {
        id: string;
        displayName: string;
        abbreviation: string;
        logo: string;
      };
      score: string;
    }>;
  }>;
}

interface Player {
  id: string;
  displayName: string;
  position: {
    abbreviation: string;
    name: string;
  };
  jersey: string;
  age: number;
  height: number;
  weight: number;
  experience: number;
  headshot?: {
    href: string;
  };
  stats?: {
    name: string;
    value: number;
  }[];
}

interface TeamRoster {
  athletes: Player[];
}

interface TeamInfo {
  description: string;
  founded: number;
  championships: number;
  conference: string;
  division: string;
  generalManager: string;
  headCoach: string;
  owner: string;
}

export default function TeamDetailScreen() {
  const { id } = useLocalSearchParams();
  const [team, setTeam] = useState<TeamDetails | null>(null);
  const [upcomingGames, setUpcomingGames] = useState<Game[]>([]);
  const [pastGames, setPastGames] = useState<Game[]>([]);
  const [roster, setRoster] = useState<Player[]>([]);
  const [teamInfo, setTeamInfo] = useState<TeamInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();

  const fetchTeamDetails = async () => {
    try {
      const response = await axios.get(
        `http://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${id}`
      );
      setTeam(response.data.team);
    } catch (error) {
      console.error('Error fetching team details:', error);
    }
  };

  const fetchTeamGames = async () => {
    try {
      const dates = [];
      const today = new Date();
      const D_PAST = 10; // Number of past days to show
      const D_FUTURE = 10; // Number of future days

      for (let i = -D_PAST; i < D_FUTURE; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        dates.push(date.toISOString().split('T')[0].replace(/-/g, ''));
      }

      const allGames: Game[] = [];

      for (const dateStr of dates) {
        try {
          const response = await axios.get<{ events: Game[] }>(
            `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${dateStr}`
          );
          if (response.data?.events) {
            allGames.push(...response.data.events);
          }
        } catch (dateError) {
          console.log(`No games found for date ${dateStr} or API error for this date.`);
        }
      }

      const teamGames = allGames.filter(game => 
        game.competitions[0].competitors.some(comp => comp.team.id === id)
      );

      const now = new Date();
      const upcoming = teamGames.filter(game => new Date(game.date) > now);
      const past = teamGames.filter(game => new Date(game.date) <= now);

      setUpcomingGames(upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      setPastGames(past.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (error) {
      console.error('Error fetching team games:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchTeamRoster = async () => {
    try {
      const response = await axios.get<TeamRoster>(
        `http://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${id}/roster`
      );
      setRoster(response.data.athletes);
    } catch (error) {
      console.error('Error fetching team roster:', error);
    }
  };

  const fetchTeamInfo = async () => {
    try {
      const response = await axios.get(
        `http://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${id}/info`
      );
      setTeamInfo(response.data.team);
    } catch (error) {
      console.error('Error fetching team info:', error);
    }
  };

  useEffect(() => {
    if (id) {
      Promise.all([
        fetchTeamDetails(),
        fetchTeamGames(),
        fetchTeamRoster(),
        fetchTeamInfo(),
      ]);
    }
  }, [id]);

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([
      fetchTeamDetails(),
      fetchTeamGames(),
      fetchTeamRoster(),
      fetchTeamInfo(),
    ]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
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

  const renderGame = (game: Game) => {
    const competition = game.competitions[0];
    const homeTeam = competition.competitors.find(c => c.homeAway === 'home');
    const awayTeam = competition.competitors.find(c => c.homeAway === 'away');
    const isHomeGame = homeTeam?.team.id === id;

    return (
      <TouchableOpacity
        key={game.id}
        style={[styles.gameCard, { backgroundColor: Colors[colorScheme ?? 'light'].card }]}
        onPress={() => router.push(`/game/${game.id}`)}
      >
        <View style={styles.gameHeader}>
          <ThemedText style={styles.gameDate}>
            {formatDate(game.date)} • {formatTime(game.date)}
          </ThemedText>
          <ThemedText style={styles.gameStatus}>
            {game.status.type.description}
          </ThemedText>
        </View>
        <View style={styles.gameTeams}>
          <View style={styles.teamContainer}>
            <Image
              source={{ uri: awayTeam?.team.logo }}
              style={styles.teamLogo}
              resizeMode="contain"
            />
            <ThemedText style={styles.teamName}>
              {awayTeam?.team.abbreviation}
            </ThemedText>
            {game.status.type.completed && (
              <ThemedText style={styles.score}>{awayTeam?.score}</ThemedText>
            )}
          </View>
          <ThemedText style={styles.vs}>@</ThemedText>
          <View style={styles.teamContainer}>
            <Image
              source={{ uri: homeTeam?.team.logo }}
              style={styles.teamLogo}
              resizeMode="contain"
            />
            <ThemedText style={styles.teamName}>
              {homeTeam?.team.abbreviation}
            </ThemedText>
            {game.status.type.completed && (
              <ThemedText style={styles.score}>{homeTeam?.score}</ThemedText>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPlayer = (player: Player) => (
    <TouchableOpacity
      key={player.id}
      style={[styles.playerCard, { backgroundColor: Colors[colorScheme ?? 'light'].card }]}
      onPress={() => router.push(`/player/${player.id}`)}
    >
      <View style={styles.playerHeader}>
        {player.headshot ? (
          <Image
            source={{ uri: player.headshot.href }}
            style={styles.playerHeadshot}
            resizeMode="contain"
          />
        ) : (
          <View style={[styles.playerHeadshot, styles.playerHeadshotPlaceholder]}>
            <IconSymbol name="person.fill" size={24} color={Colors[colorScheme ?? 'light'].text} />
          </View>
        )}
        <View style={styles.playerInfo}>
          <ThemedText style={styles.playerName}>{player.displayName}</ThemedText>
          <View style={styles.playerDetails}>
            <ThemedText style={styles.playerJersey}>#{player.jersey}</ThemedText>
            <ThemedText style={styles.playerPosition}>{player.position.abbreviation}</ThemedText>
          </View>
        </View>
      </View>
      <View style={styles.playerStats}>
        <View style={styles.playerStat}>
          <ThemedText style={styles.playerStatLabel}>Age</ThemedText>
          <ThemedText style={styles.playerStatValue}>{player.age}</ThemedText>
        </View>
        <View style={styles.playerStat}>
          <ThemedText style={styles.playerStatLabel}>Height</ThemedText>
          <ThemedText style={styles.playerStatValue}>{player.height} cm</ThemedText>
        </View>
        <View style={styles.playerStat}>
          <ThemedText style={styles.playerStatLabel}>Weight</ThemedText>
          <ThemedText style={styles.playerStatValue}>{player.weight} kg</ThemedText>
        </View>
        <View style={styles.playerStat}>
          <ThemedText style={styles.playerStatLabel}>Exp</ThemedText>
          <ThemedText style={styles.playerStatValue}>
            {typeof player.experience === 'object' ? player.experience.years : player.experience} yrs
          </ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={Colors[colorScheme ?? 'light'].text} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Team Details</ThemedText>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} />
          <ThemedText style={styles.loadingText}>Loading team details...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!team) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={Colors[colorScheme ?? 'light'].text} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Team Details</ThemedText>
        </View>
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>Team not found</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={Colors[colorScheme ?? 'light'].text} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>{team.displayName}</ThemedText>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Team Header */}
        <View style={[styles.teamHeader, { backgroundColor: `#${team.color}20` }]}>
          <Image
            source={{ uri: team.logos?.[0]?.href }}
            style={styles.teamLogo}
            resizeMode="contain"
          />
          <View style={styles.teamInfo}>
            <ThemedText style={styles.teamName}>{team.displayName}</ThemedText>
            <ThemedText style={styles.teamLocation}>{team.location}</ThemedText>
            <ThemedText style={styles.teamAbbr}>{team.abbreviation}</ThemedText>
          </View>
        </View>

        {/* Team Info */}
        {teamInfo && (
          <View style={[styles.section, { backgroundColor: Colors[colorScheme ?? 'light'].card }]}>
            <ThemedText style={styles.sectionTitle}>Team Information</ThemedText>
            {teamInfo.description && (
              <ThemedText style={styles.teamDescription}>{teamInfo.description}</ThemedText>
            )}
            <View style={styles.teamInfoGrid}>
              {teamInfo.founded && (
                <View style={styles.teamInfoItem}>
                  <ThemedText style={styles.teamInfoLabel}>Founded</ThemedText>
                  <ThemedText style={styles.teamInfoValue}>{teamInfo.founded}</ThemedText>
                </View>
              )}
              {teamInfo.championships && (
                <View style={styles.teamInfoItem}>
                  <ThemedText style={styles.teamInfoLabel}>Championships</ThemedText>
                  <ThemedText style={styles.teamInfoValue}>{teamInfo.championships}</ThemedText>
                </View>
              )}
              {teamInfo.conference && (
                <View style={styles.teamInfoItem}>
                  <ThemedText style={styles.teamInfoLabel}>Conference</ThemedText>
                  <ThemedText style={styles.teamInfoValue}>{teamInfo.conference}</ThemedText>
                </View>
              )}
              {teamInfo.division && (
                <View style={styles.teamInfoItem}>
                  <ThemedText style={styles.teamInfoLabel}>Division</ThemedText>
                  <ThemedText style={styles.teamInfoValue}>{teamInfo.division}</ThemedText>
                </View>
              )}
              {teamInfo.generalManager && (
                <View style={styles.teamInfoItem}>
                  <ThemedText style={styles.teamInfoLabel}>GM</ThemedText>
                  <ThemedText style={styles.teamInfoValue}>{teamInfo.generalManager}</ThemedText>
                </View>
              )}
              {teamInfo.headCoach && (
                <View style={styles.teamInfoItem}>
                  <ThemedText style={styles.teamInfoLabel}>Head Coach</ThemedText>
                  <ThemedText style={styles.teamInfoValue}>{teamInfo.headCoach}</ThemedText>
                </View>
              )}
              {teamInfo.owner && (
                <View style={styles.teamInfoItem}>
                  <ThemedText style={styles.teamInfoLabel}>Owner</ThemedText>
                  <ThemedText style={styles.teamInfoValue}>{teamInfo.owner}</ThemedText>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Team Record */}
        {team.record?.items?.[0] && (
          <View style={[styles.section, { backgroundColor: Colors[colorScheme ?? 'light'].card }]}>
            <ThemedText style={styles.sectionTitle}>Season Record</ThemedText>
            <ThemedText style={styles.recordText}>
              {team.record.items[0].summary}
            </ThemedText>
            
            {team.record.items[0].stats && (
              <View style={styles.statsContainer}>
                {team.record.items[0].stats.map((stat, index) => (
                  <View key={index} style={styles.statItem}>
                    <ThemedText style={styles.statLabel}>{stat.name}</ThemedText>
                    <ThemedText style={styles.statValue}>{stat.value}</ThemedText>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Team Roster */}
        {roster.length > 0 && (
          <View style={[styles.section, { backgroundColor: Colors[colorScheme ?? 'light'].card }]}>
            <ThemedText style={styles.sectionTitle}>Team Roster</ThemedText>
            {roster.map(player => renderPlayer(player))}
          </View>
        )}

        {/* Upcoming Games */}
        {upcomingGames.length > 0 && (
          <View style={[styles.section, { backgroundColor: Colors[colorScheme ?? 'light'].card }]}>
            <ThemedText style={styles.sectionTitle}>Upcoming Games</ThemedText>
            {upcomingGames.map(game => renderGame(game))}
          </View>
        )}

        {/* Past Games */}
        {pastGames.length > 0 && (
          <View style={[styles.section, { backgroundColor: Colors[colorScheme ?? 'light'].card }]}>
            <ThemedText style={styles.sectionTitle}>Past Games</ThemedText>
            {pastGames.map(game => renderGame(game))}
          </View>
        )}

        {/* Venue Information */}
        {team.venue && (
          <View style={[styles.section, { backgroundColor: Colors[colorScheme ?? 'light'].card }]}>
            <ThemedText style={styles.sectionTitle}>Home Venue</ThemedText>
            <ThemedText style={styles.venueName}>{team.venue.fullName}</ThemedText>
            <ThemedText style={styles.venueLocation}>
              {team.venue.address.city}, {team.venue.address.state}
            </ThemedText>
          </View>
        )}

        {/* Team Leaders */}
        {team.leaders && team.leaders.length > 0 && (
          <View style={[styles.section, { backgroundColor: Colors[colorScheme ?? 'light'].card }]}>
            <ThemedText style={styles.sectionTitle}>Team Leaders</ThemedText>
            {team.leaders.map((category, index) => (
              <View key={index} style={styles.leaderCategory}>
                <ThemedText style={styles.leaderCategoryName}>
                  {category.displayName}
                </ThemedText>
                {category.leaders.map((leader, leaderIndex) => (
                  <View key={leaderIndex} style={styles.leaderItem}>
                    <ThemedText style={styles.leaderName}>
                      {leader.athlete.displayName}
                    </ThemedText>
                    <ThemedText style={styles.leaderValue}>
                      {leader.value}
                    </ThemedText>
                  </View>
                ))}
              </View>
            ))}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    marginRight: 15,
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  teamLogo: {
    width: 80,
    height: 80,
    marginRight: 20,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  teamLocation: {
    fontSize: 16,
    opacity: 0.8,
    marginBottom: 4,
  },
  teamAbbr: {
    fontSize: 14,
    opacity: 0.6,
  },
  section: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  recordText: {
    fontSize: 16,
    marginBottom: 15,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  statItem: {
    width: '33.33%',
    padding: 5,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  venueName: {
    fontSize: 16,
    marginBottom: 4,
  },
  venueLocation: {
    fontSize: 14,
    opacity: 0.8,
  },
  leaderCategory: {
    marginBottom: 15,
  },
  leaderCategoryName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  leaderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  leaderName: {
    fontSize: 14,
  },
  leaderValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  gameCard: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  gameDate: {
    fontSize: 12,
    opacity: 0.8,
  },
  gameStatus: {
    fontSize: 12,
    opacity: 0.8,
  },
  gameTeams: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamContainer: {
    flex: 1,
    alignItems: 'center',
  },
  vs: {
    fontSize: 16,
    opacity: 0.6,
    marginHorizontal: 10,
  },
  score: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  teamDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 15,
    opacity: 0.8,
  },
  teamInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  teamInfoItem: {
    width: '50%',
    padding: 5,
  },
  teamInfoLabel: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 2,
  },
  teamInfoValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  playerCard: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  playerHeadshot: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  playerHeadshotPlaceholder: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  playerDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerJersey: {
    fontSize: 14,
    opacity: 0.8,
    marginRight: 8,
  },
  playerPosition: {
    fontSize: 14,
    opacity: 0.8,
  },
  playerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    paddingTop: 10,
  },
  playerStat: {
    alignItems: 'center',
  },
  playerStatLabel: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 2,
  },
  playerStatValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
