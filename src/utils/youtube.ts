export const YOUTUBE_API_KEY = 'AIzaSyCd7F8UzWQpS2cjffxnPdSaODsERIJOhpc';
export const CHANNEL_ID = 'UCBmEIVks75eLzhbgrdbZ1Ng';

export interface Video {
  title: string;
  thumbnail: string;
  url: string;
  publishedAt: string;
}

export async function getChannelVideos(channelId: string, maxResults = 16) {
  try {
    // First get the uploads playlist ID
    const channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${YOUTUBE_API_KEY}`
    );
    const channelData = await channelResponse.json();
    
    if (!channelData.items || channelData.items.length === 0) {
      console.error('No channel found with ID:', channelId);
      console.error('API Response:', channelData);
      return [];
    }

    const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

    // Then get videos from the uploads playlist
    const videosResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=${maxResults}&playlistId=${uploadsPlaylistId}&key=${YOUTUBE_API_KEY}`
    );
    const videosData = await videosResponse.json();

    if (!videosData.items || videosData.items.length === 0) {
      console.error('No videos found for playlist:', uploadsPlaylistId);
      console.error('API Response:', videosData);
      return [];
    }

    return videosData.items.map((item: any) => ({
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.high.url,
      url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
      publishedAt: item.snippet.publishedAt
    }));
  } catch (error) {
    console.error('Error fetching YouTube videos:', error);
    return [];
  }
}
