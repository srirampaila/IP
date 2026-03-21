import { useState, useRef, useEffect } from 'react';
import { db, storage } from '../../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Image, Video, Globe, Lock, Search, X } from 'lucide-react';
import './SocialHub.css';

const CreatePost = () => {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : { id: 'demo_user_1', name: 'Estate Manager' };
    const CURRENT_USER = { uid: user.id, displayName: user.name };
    const [content, setContent] = useState('');
    const [visibility, setVisibility] = useState<'public' | 'private'>('public');
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Private Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedRecipient, setSelectedRecipient] = useState<any | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Handle Media selection
    const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setMediaFile(file);
            setMediaPreview(URL.createObjectURL(file));
        }
    };

    const clearMedia = () => {
        setMediaFile(null);
        setMediaPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Handle User Search for Private Posts
    useEffect(() => {
        const searchUsers = async () => {
            if (searchQuery.length < 2) {
                setSearchResults([]);
                return;
            }
            try {
                // In a real app, you'd use a better text search solution (Algolia/Typesense)
                // Firestore doesn't support generic substring search easily
                const q = query(
                    collection(db, 'users'),
                    where('displayName', '>=', searchQuery),
                    where('displayName', '<=', searchQuery + '\uf8ff')
                );
                const snapshot = await getDocs(q);
                const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setSearchResults(users.filter(u => u.id !== CURRENT_USER.uid));
            } catch (err) {
                console.error("Error searching users", err);
            }
        };
        const debounceId = setTimeout(searchUsers, 500);
        return () => clearTimeout(debounceId);
    }, [searchQuery]);

    const handleSubmit = async () => {
        if (!content && !mediaFile) return;
        if (visibility === 'private' && !selectedRecipient) {
            alert('Please select a recipient for your private message.');
            return;
        }

        setIsSubmitting(true);
        let mediaUrl = null;
        let mediaType = null;

        try {
            // 1. Upload Media if present
            if (mediaFile) {
                const storageRef = ref(storage, `social_media/${Date.now()}_${mediaFile.name}`);
                const uploadTask = uploadBytesResumable(storageRef, mediaFile);

                mediaUrl = await new Promise((resolve, reject) => {
                    uploadTask.on(
                        'state_changed',
                        (snapshot) => {
                            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                            setUploadProgress(progress);
                        },
                        (error) => reject(error),
                        async () => {
                            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                            resolve(downloadURL);
                        }
                    );
                });
                mediaType = mediaFile.type.startsWith('video/') ? 'video' : 'image';
            }

            // 2. Save Post to Firestore
            await addDoc(collection(db, 'posts'), {
                authorId: CURRENT_USER.uid,
                authorName: CURRENT_USER.displayName,
                content,
                mediaUrl,
                mediaType,
                type: visibility,
                recipientId: visibility === 'private' ? selectedRecipient.id : null,
                recipientName: visibility === 'private' ? selectedRecipient.displayName : null,
                likesCount: 0,
                timestamp: serverTimestamp()
            });

            // Reset Form
            setContent('');
            clearMedia();
            setVisibility('public');
            setSelectedRecipient(null);
            setSearchQuery('');
            setUploadProgress(0);
        } catch (error) {
            console.error('Error posting:', error);
            alert('Failed to post. Check console.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="create-post-card">
            <div className="d-flex gap-3 mb-3">
                <div className="post-avatar shadow-sm">
                    {CURRENT_USER.displayName.charAt(0)}
                </div>
                <div className="flex-grow-1">
                    <textarea
                        className="create-post-textarea"
                        placeholder="Share an update with the community..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        disabled={isSubmitting}
                    />
                </div>
            </div>

            {/* Media Preview Area */}
            {mediaPreview && (
                <div className="media-preview">
                    {mediaFile?.type.startsWith('video/') ? (
                        <video src={mediaPreview} controls />
                    ) : (
                        <img src={mediaPreview} alt="Preview" />
                    )}
                    <button className="remove-media-btn" onClick={clearMedia} disabled={isSubmitting}>
                        <X size={16} />
                    </button>
                    {isSubmitting && uploadProgress > 0 && (
                        <div className="position-absolute bottom-0 start-0 w-100 bg-light" style={{ height: '4px' }}>
                            <div className="bg-primary h-100" style={{ width: `${uploadProgress}%`, transition: 'width 0.2s' }}></div>
                        </div>
                    )}
                </div>
            )}

            {/* Visibility & Search (Private) */}
            <div className="d-flex align-items-center gap-2 mt-3 p-2 bg-light rounded-3 position-relative">
                <button
                    className={`btn btn-sm ${visibility === 'public' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setVisibility('public')}
                >
                    <Globe size={14} className="me-1" /> Public
                </button>
                <button
                    className={`btn btn-sm ${visibility === 'private' ? 'btn-dark' : 'btn-outline-secondary'}`}
                    onClick={() => {
                        setVisibility('private');
                        setSelectedRecipient(null);
                    }}
                >
                    <Lock size={14} className="me-1" /> Private DM
                </button>

                {visibility === 'private' && (
                    <div className="flex-grow-1 ms-2 position-relative">
                        {!selectedRecipient ? (
                            <div className="d-flex align-items-center bg-white border rounded ps-2 pe-1">
                                <Search size={14} className="text-muted" />
                                <input
                                    type="text"
                                    className="form-control border-0 shadow-none form-control-sm"
                                    placeholder="Search resident..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        ) : (
                            <div className="d-flex align-items-center bg-dark text-white rounded px-3 py-1" style={{ fontSize: '0.9rem', width: 'fit-content' }}>
                                Sending to: {selectedRecipient.displayName}
                                <button className="btn btn-link p-0 text-white ms-2" onClick={() => setSelectedRecipient(null)}>
                                    <X size={14} />
                                </button>
                            </div>
                        )}

                        {/* Search Dropdown */}
                        {searchQuery && searchResults.length > 0 && !selectedRecipient && (
                            <div className="user-search-results w-100">
                                {searchResults.map(user => (
                                    <div
                                        key={user.id}
                                        className="user-search-item"
                                        onClick={() => {
                                            setSelectedRecipient(user);
                                            setSearchQuery('');
                                            setSearchResults([]);
                                        }}
                                    >
                                        <div className="post-avatar" style={{ width: '24px', height: '24px', fontSize: '0.7rem' }}>
                                            {user.displayName.charAt(0)}
                                        </div>
                                        {user.displayName}
                                    </div>
                                ))}
                            </div>
                        )}
                        {searchQuery && searchResults.length === 0 && searchQuery.length > 1 && !selectedRecipient && (
                            <div className="user-search-results w-100 p-2 text-muted text-center" style={{ fontSize: '0.85rem' }}>
                                No users found.
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="create-post-actions">
                <div className="d-flex gap-2">
                    <input
                        type="file"
                        accept="image/*,video/*"
                        className="d-none"
                        ref={fileInputRef}
                        onChange={handleMediaChange}
                    />
                    <button className="action-btn" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}>
                        <Image size={18} /> Photo
                    </button>
                    <button className="action-btn" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}>
                        <Video size={18} /> Video
                    </button>
                </div>
                <button
                    className="post-submit-btn"
                    onClick={handleSubmit}
                    disabled={isSubmitting || (!content.trim() && !mediaFile) || (visibility === 'private' && !selectedRecipient)}
                >
                    {isSubmitting ? 'Posting...' : 'Post'}
                </button>
            </div>
        </div>
    );
};

export default CreatePost;
