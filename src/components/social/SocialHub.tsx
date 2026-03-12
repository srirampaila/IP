import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, onSnapshot, or, where } from 'firebase/firestore';
import CreatePost from './CreatePost';
import PostCard from './PostCard';
import './SocialHub.css';

const CURRENT_USER = {
    uid: 'demo_user_1',
    displayName: 'Estate Manager'
};

const SocialHub = () => {
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Query: Get all Public posts OR Private posts where the current user is either author or recipient
        const q = query(
            collection(db, 'posts'),
            or(
                where('type', '==', 'public'),
                where('recipientId', '==', CURRENT_USER.uid),
                where('authorId', '==', CURRENT_USER.uid)
            ),
            orderBy('timestamp', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPosts(fetchedPosts);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching feed: ", error);
            setLoading(false);
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
