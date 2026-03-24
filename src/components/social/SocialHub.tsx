import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import CreatePost from './CreatePost';
import PostCard from './PostCard';
import './SocialHub.css';

const SocialHub = () => {
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const userStr = localStorage.getItem('user');
    // Ensure we don't crash if user is null by relying on fallbacks safely
    const user = userStr ? JSON.parse(userStr) : null;

    useEffect(() => {
        // Unified Feed: Fetch all posts globally for everyone in the Community Hub
        const q = query(
            collection(db, 'posts'),
            orderBy('timestamp', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            // 4. Debugging Check as requested by user
            console.log("Fetched posts for user:", snapshot.docs.map(doc => doc.data()));

            const fetchedPosts = snapshot.docs.map(doc => {
                const data = doc.data();
                return { 
                    id: doc.id, 
                    ...data,
                    // Fallback timestamp guarantees optimistic local writes appear instantly
                    timestamp: data.timestamp || { seconds: Math.floor(Date.now() / 1000) }
                };
            });
            
            // 2. Local State Management: manual sort guarantees new messages appear at the top
            fetchedPosts.sort((a: any, b: any) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

            // 3. Update React State to sync UI without refresh
            setPosts(fetchedPosts);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching feed: ", error);
            setLoading(false);
            // Optionally, we could set an error state here if requested.
        });

        return () => unsubscribe();
    }, []);

    return (
        <div className="social-hub-container mt-4">
            <h4 className="mb-4 text-center fw-bold" style={{ color: '#1a1a1a' }}>Community Social Hub</h4>

            <CreatePost />

            <div className="feed-separator mb-4 d-flex align-items-center">
                <div className="flex-grow-1 border-bottom"></div>
                <span className="mx-3 text-muted fw-semibold" style={{ fontSize: '0.9rem' }}>LATEST ACTIVITY</span>
                <div className="flex-grow-1 border-bottom"></div>
            </div>

            <div className="post-feed">
                {loading ? (
                    <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status"></div>
                        <p className="mt-2 text-muted">Loading feed...</p>
                    </div>
                ) : posts.length > 0 ? (
                    posts.map(post => <PostCard key={post.id} post={post} />)
                ) : (
                    <div className="text-center text-muted py-5 bg-white border rounded-3 shadow-sm">
                        <h5 className="mb-2">No posts yet</h5>
                        <p>Be the first to share something with the community!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SocialHub;
