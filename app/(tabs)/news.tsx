import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Linking,
  Modal,
} from 'react-native';
import axios from 'axios';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

interface NewsArticle {
  id: string;
  headline: string;
  description: string;
  published: string;
  images?: Array<{
    url: string;
    width?: number;
    height?: number;
    alt?: string;
  }>;
  links: {
    web: {
      href: string;
    };
  };
  categories?: Array<{
    description: string;
  }>;
}

export default function NewsScreen() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const colorScheme = useColorScheme(); // Get the current color scheme

  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [isArticleModalVisible, setIsArticleModalVisible] = useState(false);

  const fetchNews = async () => {
    try {
      setError(null);
      const response = await axios.get(
        'http://site.api.espn.com/apis/site/v2/sports/basketball/nba/news'
      );
      setArticles(response.data.articles || []);
    } catch (e) {
      console.error('Error fetching news:', e);
      setError('Failed to load news. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNews();
  };

  const handleArticlePress = (article: NewsArticle) => {
    setSelectedArticle(article);
    setIsArticleModalVisible(true);
  };

  const handleOpenExternalLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Error opening article in browser:', error);
      alert('Could not open the article in your browser.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderArticle = (article: NewsArticle) => {
    const imageUrl = article.images?.[0]?.url;
    const categoryText = article.categories?.[0]?.description;

    return (
      <TouchableOpacity
        key={article.id}
        style={[styles.articleCard, { backgroundColor: Colors[colorScheme ?? 'light'].card }]}
        onPress={() => handleArticlePress(article)}
      >
        {imageUrl && (
          <Image
            source={{ uri: imageUrl }}
            style={styles.articleImageCompact}
            resizeMode="cover"
          />
        )}
        
        <View style={styles.articleContentCompact}>
          <View style={styles.articleHeaderCompact}>
            <ThemedText style={styles.articleDateCompact}>
              {formatDate(article.published)}
            </ThemedText>
            {categoryText && (
              <View style={[styles.categoryBadge, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}> {/* Use themed tint */}
                <ThemedText style={styles.categoryText}>
                  {categoryText}
                </ThemedText>
              </View>
            )}
          </View>
          
          <ThemedText type="subtitle" style={styles.articleTitleCompact} numberOfLines={2}>
            {article.headline}
          </ThemedText>
          
          {article.description && (
            <ThemedText style={styles.articleDescriptionCompact} numberOfLines={3}>
              {article.description}
            </ThemedText>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderArticleDetailModal = () => {
    if (!selectedArticle) return null;

    const imageUrl = selectedArticle.images?.[0]?.url;
    const categoryText = selectedArticle.categories?.[0]?.description;

    return (
      <Modal
        animationType="slide"
        transparent={false}
        visible={isArticleModalVisible}
        onRequestClose={() => setIsArticleModalVisible(false)}
      >
        {/* ThemedView should handle the primary background of the modal */}
        <ThemedView style={styles.modalContainer}> 
          <ScrollView contentContainerStyle={styles.modalScrollViewContent}>
            {imageUrl && (
              <Image
                source={{ uri: imageUrl }}
                style={styles.modalArticleImage}
                resizeMode="cover"
              />
            )}
            
            <View style={styles.modalContentArea}>
              <ThemedText type="title" style={styles.modalArticleTitle}>
                {selectedArticle.headline}
              </ThemedText>

              <View style={styles.modalMetaInfo}>
                <ThemedText style={styles.modalArticleDate}>
                  {formatDate(selectedArticle.published)}
                </ThemedText>
                {categoryText && (
                  <View style={[styles.categoryBadge, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}> {/* Use themed tint */}
                    <ThemedText style={styles.categoryText}>
                      {categoryText}
                    </ThemedText>
                  </View>
                )}
              </View>

              {selectedArticle.description ? (
                <ThemedText style={styles.modalArticleDescription}>
                  {selectedArticle.description}
                </ThemedText>
              ) : (
                <ThemedText style={styles.modalNoDescriptionText}>
                  No detailed summary available for this article.
                </ThemedText>
              )}
            </View>
          </ScrollView>

          <View style={[styles.modalFooter, { borderTopColor: Colors[colorScheme ?? 'light'].border, backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
            <TouchableOpacity 
              style={[styles.modalExternalLinkButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]} 
              onPress={() => handleOpenExternalLink(selectedArticle.links.web.href)}
            >
              <ThemedText style={styles.modalExternalLinkButtonText}>
                Read Full Article on ESPN.com
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalCloseButton, { backgroundColor: Colors[colorScheme ?? 'light'].border }]} 
              onPress={() => setIsArticleModalVisible(false)}
            >
              <ThemedText style={[styles.modalCloseButtonText, { color: Colors[colorScheme ?? 'light'].text }]}>
                Close
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </Modal>
    );
  };

  if (loading) {
    return (
      <ThemedView style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} />
        <ThemedText style={styles.loadingText}>Loading news...</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={[styles.container, styles.centerContent]}>
        <View style={[styles.header, { borderBottomColor: Colors[colorScheme ?? 'light'].border }]}> {/* Apply themed border */}
            <ThemedText type="title" style={styles.title}>NBA News</ThemedText>
            <ThemedText type="default" style={styles.subtitle}>Latest updates</ThemedText>
        </View>
        <ThemedText style={styles.errorText}>{error}</ThemedText>
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]} onPress={fetchNews}>
            <ThemedText style={styles.retryText}>Retry</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { borderBottomColor: Colors[colorScheme ?? 'light'].border }]}> {/* Apply themed border */}
        <ThemedText type="title" style={styles.title}>NBA News</ThemedText>
        <ThemedText type="default" style={styles.subtitle}>Latest updates</ThemedText>
      </View>
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors[colorScheme ?? 'light'].tint} />
        }
        showsVerticalScrollIndicator={false}
      >
        {articles.length > 0 ? (
          articles.map(renderArticle)
        ) : (
          <View style={styles.noNewsContainer}>
            <ThemedText style={styles.noNewsText}>No news available at the moment.</ThemedText>
            <ThemedText style={styles.noNewsSubText}>Pull down to refresh or check back later.</ThemedText>
            <TouchableOpacity style={[styles.retryButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]} onPress={fetchNews}>
              <ThemedText style={styles.retryText}>Refresh Now</ThemedText>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {renderArticleDetailModal()}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    borderBottomWidth: 1,
    // borderBottomColor handled inline
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.8,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2,
    // backgroundColor handled inline
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  articleCard: {
    flexDirection: 'row',
    marginBottom: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
    overflow: 'hidden',
    padding: 10,
  },
  articleImageCompact: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 10,
    flexShrink: 0,
    backgroundColor: '#f0f0f0',
  },
  articleContentCompact: {
    flex: 1,
    justifyContent: 'space-between',
  },
  articleHeaderCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  articleDateCompact: {
    fontSize: 11,
    opacity: 0.7,
  },
  categoryBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    // backgroundColor handled inline
  },
  categoryText: {
    fontSize: 9,
    color: 'white',
    fontWeight: '600',
  },
  articleTitleCompact: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    lineHeight: 20,
  },
  articleDescriptionCompact: {
    fontSize: 13,
    opacity: 0.8,
    lineHeight: 18,
  },
  noNewsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  noNewsText: {
    fontSize: 18,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 8,
  },
  noNewsSubText: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
    marginBottom: 20,
  },

  modalContainer: {
    flex: 1,
    paddingTop: 50,
    // backgroundColor handled by ThemedView
  },
  modalScrollViewContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  modalArticleImage: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
    backgroundColor: '#f0f0f0',
  },
  modalContentArea: {
    padding: 20,
  },
  modalArticleTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalMetaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalArticleDate: {
    fontSize: 13,
    opacity: 0.7,
  },
  modalArticleDescription: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.9,
    marginTop: 10,
  },
  modalNoDescriptionText: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.7,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    // borderTopColor and backgroundColor handled inline
    flexDirection: 'column',
    gap: 10,
  },
  modalExternalLinkButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    // backgroundColor handled inline
  },
  modalExternalLinkButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalCloseButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    // backgroundColor handled inline
  },
  modalCloseButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
    // color handled inline
  },
});
