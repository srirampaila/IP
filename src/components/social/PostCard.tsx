import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, setDoc, getDoc, addDoc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { Heart, MessageCircle, Send } from 'lucide-react';
import './SocialHub.css';

// MOCK USER for testing
const CURRENT_USER = {
    uid: 'demo_user_1',
    displayName: 'Estate Manager'
};

const PostCard = ({ post }: { post: any }) => {
    const [likesCount, setLikesCount] = useState(post.likesCount || 0);
    const [isLiked, setIsLiked] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');

    // Check if liked
    useEffect(() => {
        const checkLikeStatus = async () => {
            const likeRef = doc(db, 'posts', post.id, 'likes', CURRENT_USER.uid);
            const docSnap = await getDoc(likeRef);
            setIsLiked(docSnap.exists());
        };
        checkLikeStatus();
    }, [post.id]);

    // Listen for comments
    useEffect(() => {
        if (!showComments) return;
        const q = query(
            collection(db, 'posts', post.id, 'comments'),
            orderBy('timestamp', 'asc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [post.id, showComments]);

    const handleLikeToggle = async () => {
        const postRef = doc(db, 'posts', post.id);
        const likeRef = doc(postRef, 'likes', CURRENT_USER.uid);

        try {
            if (isLiked) {
                await deleteDoc(likeRef);
                await updateDoc(postRef, { likesCount: increment(-1) });
                setLikesCount((prev: number) => Math.max(0, prev - 1));
                setIsLiked(false);
            } else {
                await setDoc(likeRef, { timestamp: serverTimestamp() });
                await updateDoc(postRef, { likesCount: increment(1) });
                setLikesCount((prev: number) => prev + 1);
                setIsLiked(true);
            }
        } catch (error) {
            console.error("Error toggling like:", error);
        }
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        try {
            await addDoc(collection(db, 'posts', post.id, 'comments'), {
                authorId: CURRENT_USER.uid,
                authorName: CURRENT_USER.displayName,
                text: newComment,
                timestamp: serverTimestamp()
            });
            setNewComment('');
        } catch (error) {
            console.error("Error adding comment:", error);
        }
    };

    // Format date securely
    const timeAgo = post.timestamp ? new Date(post.timestamp.toDate()).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Just now';

    return (
        <div className="post-card">
            {/* Header */}
            <div className="post-header">
                <div className="post-avatar">
                    {post.authorName?.charAt(0) || '?'}
                </div>
                <div className="flex-grow-1">
                    <h6 className="post-author">
                        {post.authorName}
                        {post.type === 'private' && (
                            <span className="text-muted fw-normal ms-1" style={{ fontSize: '0.9rem' }}>
                                &rarr; {post.recipientName}
                            </span>
                        )}
                    </h6>
                    <p className="post-time">{timeAgo} • {post.type === 'public' ? 'Globe' : 'Private DM'}</p>
                </div>
            </div>

            {/* Content Text */}
            {post.content && (
                <p className="post-content">
                    {post.content}
                </p>
            )}

            {/* Content Media */}
            {post.mediaUrl && (
                <div className="post-media">
                    {post.mediaType === 'video' ? (
                        <video src={post.mediaUrl} controls className="w-100" style={{ maxHeight: '400px', objectFit: 'contain', background: '#000' }} />
                    ) : (
                        <img src={post.mediaUrl} alt="Post media" />
                    )}
                </div>
            )}

            {/* Actions (Only for Public Posts generally, or DMs if you want engagement there) */}
            <div className="post-actions">
                <button className={`engagement-btn ${isLiked ? 'liked' : ''}`} onClick={handleLikeToggle}>
                    <Heart size={20} fill={isLiked ? '#e91e63' : 'none'} color={isLiked ? '#e91e63' : 'currentColor'} />
                    {likesCount} Likes
                </button>
                <button className="engagement-btn" onClick={() => setShowComments(!showComments)}>
                    <MessageCircle size={20} /> Comment
                </button>
            </div>

            {/* Comments Expandable Region */}
            {showComments && (
                <div className="comments-section">
                    {comments.length > 0 ? (
                        comments.map(comment => (
                            <div key={comment.id} className="comment-row">
                                <div className="post-avatar" style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>
                                    {comment.authorName?.charAt(0)}
                                </div>
                                <div className="comment-bubble">
                                    <div className="comment-author">{comment.authorName}</div>
                                    <div className="comment-text">{comment.text}</div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-muted text-center" style={{ fontSize: '0.9rem' }}>No comments yet. Be the first to reply!</div>
                    )}

                    <form className="add-comment-wrapper" onSubmit={handleAddComment}>
                        <div className="post-avatar" style={{ width: '36px', height: '36px', fontSize: '0.9rem' }}>
                            {CURRENT_USER.displayName.charAt(0)}
                        </div>
                        <input
                            type="text"
                            className="comment-input"
                            placeholder="Write a comment..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                        />
                        <button type="submit" className="btn btn-sm btn-light rounded-circle p-2" disabled={!newComment.trim()}>
                            <Send size={18} color="#5c6ac4" />
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default PostCard;
