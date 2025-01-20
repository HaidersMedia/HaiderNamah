export interface Video {
  title: string;
  thumbnail: string;
  url: string;
  publishedAt: string;
  videoId: string;
  id: string;
}

export interface YouTubeResponse {
  videos: Video[];
  nextPageToken: string | null;
}

export async function getChannelVideos(
  apiKey: string,
  channelId: string,
  pageToken?: string,
  maxResults = 16
): Promise<YouTubeResponse> {
  try {
    // First get the uploads playlist ID
    const channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
    );
    const channelData = await channelResponse.json();
    
    if (!channelData.items || channelData.items.length === 0) {
      console.error('No channel found with ID:', channelId);
      console.error('API Response:', channelData);
      return {
        videos: [],
        nextPageToken: null
      };
    }

    const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

    // Then get videos from the uploads playlist
    let apiUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=${maxResults}&playlistId=${uploadsPlaylistId}&key=${apiKey}`;
    if (pageToken) {
      apiUrl += `&pageToken=${pageToken}`;
    }
    const videosResponse = await fetch(apiUrl);
    const videosData = await videosResponse.json();

    if (!videosData.items || videosData.items.length === 0) {
      console.error('No videos found for playlist:', uploadsPlaylistId);
      console.error('API Response:', videosData);
      return {
        videos: [],
        nextPageToken: null
      };
    }

    return {
      videos: videosData.items.map((item: any) => ({
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.high.url,
        url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
        publishedAt: item.snippet.publishedAt,
        videoId: item.snippet.resourceId.videoId,
        id: item.snippet.resourceId.videoId
      })),
      nextPageToken: videosData.nextPageToken || null
    };
  } catch (error) {
    console.error('Error fetching YouTube videos:', error);
    return {
      videos: [],
      nextPageToken: null
    };
  }
}
