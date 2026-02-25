import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { formatRelativeTime } from '@/utils/mangaDexUtils';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Send, MessageSquare, MoreVertical, Trash2, Edit2, Reply } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
    getComments,
    createComment,
    deleteComment,
    updateComment,
    getReplies,
    type Comment,
    type CommentResponse,
} from '@/services/comment_service';
import { getSocket } from '@/lib/socket';

interface CommentSectionProps {
    mangaId: string;
    chapterId?: string;
    sourceType?: 'MANGADEX' | 'LOCAL';
}

export const CommentSection = ({ mangaId, chapterId, sourceType = 'MANGADEX' }: CommentSectionProps) => {
    const { user } = useAuth(); // Use auth hook
    const queryClient = useQueryClient();
    const [content, setContent] = useState('');
    const [replyContent, setReplyContent] = useState('');
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [expandedReplies, setExpandedReplies] = useState<string[]>([]);
    const socketRef = useRef<any>(null);

    // Define query keys
    const commentsKey = ['comments', mangaId, chapterId];
    const repliesKey = (commentId: string) => ['replies', commentId];

    // Socket connection
    useEffect(() => {
        const socket = getSocket();
        socketRef.current = socket;

        socket.emit('join_chapter', chapterId || mangaId); // Reuse join_chapter for room joining logic

        const handleNewComment = (newComment: Comment) => {
            // If it's a reply, invalidate the parent's replies and the parent comment itself (for reply count)
            if (newComment.parentId) {
                queryClient.invalidateQueries({ queryKey: repliesKey(newComment.parentId) });
                queryClient.setQueryData(commentsKey, (oldData: any) => {
                    if (!oldData) return oldData;
                    // Update reply count in infinite query data
                    return {
                        ...oldData,
                        pages: oldData.pages.map((page: CommentResponse) => ({
                            ...page,
                            comments: page.comments.map((c: Comment) =>
                                c.id === newComment.parentId
                                    ? { ...c, _count: { ...c._count, replies: (c._count?.replies || 0) + 1 } }
                                    : c
                            )
                        }))
                    };
                });
            } else {
                // Top-level comment: Prepend to first page
                queryClient.setQueryData(commentsKey, (oldData: any) => {
                    if (!oldData) return { pages: [{ comments: [newComment], nextCursor: null }], pageParams: [undefined] };
                    const newPages = [...oldData.pages];
                    if (newPages.length > 0) {
                        newPages[0] = {
                            ...newPages[0],
                            comments: [newComment, ...newPages[0].comments],
                        };
                    } else {
                        newPages.push({ comments: [newComment], nextCursor: null });
                    }
                    return { ...oldData, pages: newPages };
                });
            }
        };

        const handleUpdateComment = (updatedComment: Comment) => {
            if (updatedComment.parentId) {
                queryClient.setQueryData(repliesKey(updatedComment.parentId), (oldData: Comment[] | undefined) => {
                    if (!oldData) return oldData;
                    return oldData.map(c => c.id === updatedComment.id ? updatedComment : c);
                });
            } else {
                queryClient.setQueryData(commentsKey, (oldData: any) => {
                    if (!oldData) return oldData;
                    return {
                        ...oldData,
                        pages: oldData.pages.map((page: CommentResponse) => ({
                            ...page,
                            comments: page.comments.map((c: Comment) => c.id === updatedComment.id ? updatedComment : c)
                        }))
                    };
                });
            }
        };

        const handleDeleteComment = ({ commentId }: { commentId: string }) => {
            // We don't know the parentId easily from just ID, so we might need a more aggressive invalidation or fetch logic.
            // Ideally backend sends parentId with delete event or we search.
            // For now, let's just invalidate queries to be safe.
            queryClient.invalidateQueries({ queryKey: commentsKey });
            // Also try to remove from cache directly if possible
            queryClient.setQueryData(commentsKey, (oldData: any) => {
                if (!oldData) return oldData;
                return {
                    ...oldData,
                    pages: oldData.pages.map((page: CommentResponse) => ({
                        ...page,
                        comments: page.comments.filter((c: Comment) => c.id !== commentId)
                    }))
                };
            });
        };

        socket.on('new_comment', handleNewComment);
        socket.on('update_comment', handleUpdateComment);
        socket.on('delete_comment', handleDeleteComment);

        return () => {
            socket.off('new_comment', handleNewComment);
            socket.off('update_comment', handleUpdateComment);
            socket.off('delete_comment', handleDeleteComment);
            socket.emit('leave_chapter', chapterId || mangaId);
        };
    }, [mangaId, chapterId, queryClient]);

    // Fetch comments
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
    } = useInfiniteQuery({
        queryKey: commentsKey,
        queryFn: ({ pageParam }) => getComments(mangaId, chapterId, pageParam as string | undefined),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
    });

    const comments = data?.pages.flatMap(page => page.comments) || [];

    const createMutation = useMutation({
        mutationFn: (text: string) => createComment({ mangaId, chapterId, content: text, sourceType }),
        onSuccess: () => {
            setContent('');
            toast.success('Bình luận đã được đăng');
        },
        onError: () => toast.error('Không thể đăng bình luận'),
    });

    const replyMutation = useMutation({
        mutationFn: ({ parentId, text }: { parentId: string, text: string }) =>
            createComment({ mangaId, chapterId, content: text, parentId, sourceType }),
        onSuccess: (data) => {
            setReplyContent('');
            setReplyingTo(null);
            // Auto-expand the replies of the parent
            if (data.parentId && !expandedReplies.includes(data.parentId)) {
                setExpandedReplies(prev => [...prev, data.parentId!]);
            }
            toast.success('Đã trả lời bình luận');
        },
        onError: () => toast.error('Không thể trả lời'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, text }: { id: string, text: string }) => updateComment(id, text),
        onSuccess: () => {
            setEditingId(null);
            setEditContent('');
            toast.success('Đã cập nhật bình luận');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteComment,
        onSuccess: () => toast.success('Đã xóa bình luận'),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;
        createMutation.mutate(content);
    };

    const handleReply = (parentId: string) => {
        if (!replyContent.trim()) return;
        replyMutation.mutate({ parentId, text: replyContent });
    };

    const toggleReplies = (commentId: string) => {
        setExpandedReplies(prev =>
            prev.includes(commentId) ? prev.filter(id => id !== commentId) : [...prev, commentId]
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Bình luận
                </h3>
                <span className="text-sm text-neutral-400">
                    {comments.length > 0 ? `${comments.length} bình luận` : 'Chưa có bình luận'}
                </span>
            </div>

            {user ? (
                <form onSubmit={handleSubmit} className="flex gap-4">
                    <Avatar>
                        <AvatarImage src={user.profilePicture || undefined} />
                        <AvatarFallback>{user.displayName?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                        <Textarea
                            value={content}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
                            placeholder="Viết bình luận của bạn..."
                            className="bg-neutral-900 border-neutral-700 min-h-[100px] resize-none focus-visible:ring-blue-500 text-neutral-200"
                        />
                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                disabled={createMutation.isPending || !content.trim()}
                                className='bg-blue-600 hover:bg-blue-700 text-white'
                            >
                                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                                Đăng bình luận
                            </Button>
                        </div>
                    </div>
                </form>
            ) : (
                <div className="bg-neutral-900 rounded-lg p-6 text-center text-neutral-400 border border-neutral-800">
                    Vui lòng đăng nhập để bình luận.
                </div>
            )}

            <div className="space-y-6">
                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                ) : comments.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500">
                        Hãy là người đầu tiên bình luận!
                    </div>
                ) : (
                    <>
                        {comments.map((comment: Comment) => (
                            <CommentItem
                                key={comment.id}
                                comment={comment}
                                currentUser={user}
                                onReply={handleReply}
                                onEdit={(id: string, text: string) => updateMutation.mutate({ id, text })}
                                onDelete={(id: string) => deleteMutation.mutate(id)}
                                replyingTo={replyingTo}
                                setReplyingTo={setReplyingTo}
                                replyContent={replyContent}
                                setReplyContent={setReplyContent}
                                editingId={editingId}
                                setEditingId={setEditingId}
                                editContent={editContent}
                                setEditContent={setEditContent}
                                expandedReplies={expandedReplies}
                                toggleReplies={toggleReplies}
                                isReplying={replyMutation.isPending}
                            />
                        ))}
                        {hasNextPage && (
                            <div className="flex justify-center pt-4">
                                <Button
                                    variant="ghost"
                                    onClick={() => fetchNextPage()}
                                    disabled={isFetchingNextPage}
                                >
                                    {isFetchingNextPage ? (
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    ) : (
                                        'Xem thêm bình luận'
                                    )}
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

// Sub-component for individual comment interface
// Extracted for cleaner code handling nesting
const CommentItem = ({
    comment, currentUser, onReply, onEdit, onDelete,
    replyingTo, setReplyingTo, replyContent, setReplyContent,
    editingId, setEditingId, editContent, setEditContent,
    expandedReplies, toggleReplies, isReplying
}: any) => {
    const isOwner = currentUser?.id === comment.userId;
    const isEditing = editingId === comment.id;
    const isReplyingThis = replyingTo === comment.id;

    // Logic to fetch replies if expanded
    const { data: replies, isLoading: loadingReplies } = useQuery({
        queryKey: ['replies', comment.id],
        queryFn: () => getReplies(comment.id),
        enabled: expandedReplies.includes(comment.id),
    });

    return (
        <div className="flex gap-4 group">
            <Avatar className="w-10 h-10 mt-1">
                <AvatarImage src={comment.user.profilePicture || undefined} />
                <AvatarFallback>{comment.user.displayName?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-2">
                <div className="bg-neutral-900/50 rounded-lg p-3 border border-neutral-800">
                    <div className="flex items-start justify-between mb-2">
                        <div>
                            <span className="font-semibold text-white mr-2">
                                {comment.user.displayName || 'Người dùng'}
                            </span>
                            <span className="text-xs text-neutral-500">
                                {formatRelativeTime(comment.createdAt)}
                                {comment.isEdited && <span className="ml-1 text-neutral-600">(đã chỉnh sửa)</span>}
                            </span>
                        </div>

                        {/* Actions Menu */}
                        {(isOwner || currentUser?.role === 'ADMIN') && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-neutral-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                        <MoreVertical className="w-4 h-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-neutral-800 border-neutral-700 text-neutral-200">
                                    {isOwner && (
                                        <DropdownMenuItem onClick={() => {
                                            setEditingId(comment.id);
                                            setEditContent(comment.content);
                                        }} className="focus:bg-neutral-700 cursor-pointer">
                                            <Edit2 className="w-4 h-4 mr-2" /> Chỉnh sửa
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={() => onDelete(comment.id)} className="text-red-400 focus:bg-red-900/20 focus:text-red-400 cursor-pointer">
                                        <Trash2 className="w-4 h-4 mr-2" /> Xóa
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>

                    {isEditing ? (
                        <div className="space-y-2">
                            <Textarea
                                value={editContent}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditContent(e.target.value)}
                                className="bg-neutral-800 border-neutral-700 text-sm min-h-[60px] text-neutral-200"
                            />
                            <div className="flex justify-end gap-2">
                                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="text-neutral-400 hover:text-white">Hủy</Button>
                                <Button size="sm" onClick={() => onEdit(comment.id, editContent)}>Lưu</Button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-neutral-300 text-sm whitespace-pre-wrap">{comment.content}</p>
                    )}
                </div>

                {/* Actions Bar */}
                <div className="flex items-center gap-4 text-xs text-neutral-500 pl-1">
                    {currentUser && (
                        <button
                            onClick={() => {
                                if (isReplyingThis) setReplyingTo(null);
                                else {
                                    setReplyingTo(comment.id);
                                    setReplyContent('');
                                }
                            }}
                            className="hover:text-blue-400 flex items-center gap-1 transition-colors"
                        >
                            <Reply className="w-3 h-3" /> Trả lời
                        </button>
                    )}

                    {comment._count?.replies > 0 && (
                        <button
                            onClick={() => toggleReplies(comment.id)}
                            className="hover:text-white flex items-center gap-1 transition-colors"
                        >
                            {expandedReplies.includes(comment.id) ? 'Ẩn câu trả lời' : `Xem ${comment._count.replies} câu trả lời`}
                        </button>
                    )}
                </div>

                {/* Reply Form */}
                {isReplyingThis && (
                    <div className="mt-3 flex gap-3 animate-in slide-in-from-top-2 duration-200">
                        <Avatar className="w-8 h-8">
                            <AvatarImage src={currentUser.profilePicture || undefined} />
                            <AvatarFallback>{currentUser.displayName?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 gap-2 flex flex-col">
                            <Textarea
                                value={replyContent}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReplyContent(e.target.value)}
                                placeholder={`Trả lời ${comment.user.displayName}...`}
                                className="bg-neutral-900 border-neutral-700 min-h-[60px] text-sm text-neutral-200"
                                autoFocus
                            />
                            <div className="flex justify-end gap-2">
                                <Button size="sm" variant="ghost" onClick={() => setReplyingTo(null)} className="text-neutral-400 hover:text-white">Hủy</Button>
                                <Button size="sm" disabled={isReplying || !replyContent.trim()} onClick={() => onReply(comment.id)}>
                                    {isReplying ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Gửi'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Nested Replies */}
                {expandedReplies.includes(comment.id) && (
                    <div className="mt-4 pl-4 border-l-2 border-neutral-800 space-y-4">
                        {loadingReplies ? (
                            <Loader2 className="w-4 h-4 animate-spin text-neutral-500" />
                        ) : replies?.map((reply: Comment) => (
                            <CommentItem
                                key={reply.id}
                                comment={reply}
                                currentUser={currentUser}
                                onReply={onReply}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                // ... pass down other props or recursion logic if deeper nesting needed
                                // For simplified 2-level nesting:
                                replyingTo={replyingTo}
                                setReplyingTo={setReplyingTo}
                                replyContent={replyContent}
                                setReplyContent={setReplyContent}
                                editingId={editingId}
                                setEditingId={setEditingId}
                                editContent={editContent}
                                setEditContent={setEditContent}
                                expandedReplies={expandedReplies}
                                toggleReplies={toggleReplies}
                                isReplying={isReplying}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
