import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Photo } from '../../src/types'
import { APP_COLORS } from '../../src/utils/constants'
import { dbService } from '../../src/services/database'
import { useAppStore } from '../../src/store/app-store'

const { width } = Dimensions.get('window')
const imageSize = (width - 48) / 2

export default function PhotosScreen() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const { isOnline } = useAppStore()

  const loadPhotos = async () => {
    try {
      const photosData = await dbService.getPhotos()
      setPhotos(photosData)
    } catch (error) {
      console.error('Error loading photos:', error)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadPhotos()
    setRefreshing(false)
  }

  useEffect(() => {
    loadPhotos()
  }, [])

  const renderPhotoItem = ({ item }: { item: Photo }) => (
    <TouchableOpacity style={styles.photoCard}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.uri }} style={styles.image} />
        <View
          style={[
            styles.syncBadge,
            item.syncStatus === 'synced'
              ? styles.syncedBadge
              : item.syncStatus === 'pending'
                ? styles.pendingBadge
                : styles.failedBadge,
          ]}
        >
          <Ionicons
            name={
              item.syncStatus === 'synced'
                ? 'checkmark'
                : item.syncStatus === 'pending'
                  ? 'time'
                  : 'warning'
            }
            size={12}
            color="white"
          />
        </View>
      </View>
      <View style={styles.photoInfo}>
        <Text style={styles.photoDescription} numberOfLines={2}>
          {item.description || 'No description'}
        </Text>
        <Text style={styles.photoDate}>{new Date(item.timestamp).toLocaleDateString()}</Text>
      </View>
    </TouchableOpacity>
  )

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="camera-outline" size={64} color={APP_COLORS.textSecondary} />
      <Text style={styles.emptyTitle}>No photos yet</Text>
      <Text style={styles.emptySubtitle}>
        Start documenting your farms by taking photos of crops, equipment, and progress
      </Text>
      <TouchableOpacity style={styles.cameraButton}>
        <Ionicons name="camera" size={20} color="white" />
        <Text style={styles.cameraButtonText}>Take Your First Photo</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Farm Photos</Text>
          <Text style={styles.headerSubtitle}>
            {photos.length} {photos.length === 1 ? 'photo' : 'photos'} total
          </Text>
        </View>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="camera" size={24} color={APP_COLORS.primary} />
        </TouchableOpacity>
      </View>

      {!isOnline && (
        <View style={styles.offlineBar}>
          <Ionicons name="cloud-offline-outline" size={16} color={APP_COLORS.warning} />
          <Text style={styles.offlineText}>
            You&apos;re offline. Photos will upload when connection is restored.
          </Text>
        </View>
      )}

      <FlatList
        data={photos}
        renderItem={renderPhotoItem}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={photos.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={EmptyState}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={photos.length > 0 ? styles.row : undefined}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: APP_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: APP_COLORS.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    marginTop: 2,
  },
  headerButton: {
    padding: 8,
  },
  offlineBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#fde68a',
  },
  offlineText: {
    fontSize: 12,
    color: APP_COLORS.warning,
    marginLeft: 8,
    flex: 1,
  },
  list: {
    padding: 16,
  },
  row: {
    justifyContent: 'space-between',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 32,
  },
  emptyState: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: APP_COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  cameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.secondary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  cameraButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  photoCard: {
    width: imageSize,
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: imageSize,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  syncBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncedBadge: {
    backgroundColor: APP_COLORS.success,
  },
  pendingBadge: {
    backgroundColor: APP_COLORS.warning,
  },
  failedBadge: {
    backgroundColor: APP_COLORS.error,
  },
  photoInfo: {
    padding: 12,
  },
  photoDescription: {
    fontSize: 14,
    color: APP_COLORS.text,
    fontWeight: '500',
    marginBottom: 4,
  },
  photoDate: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
  },
})
