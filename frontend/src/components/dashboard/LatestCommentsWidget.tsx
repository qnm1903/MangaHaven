import { useQuery } from '@tanstack/react-query';
import { getLatestComments } from '@/services/comment_service';
import { formatRelativeTime } from '@/utils/mangaDexUtils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, MessageCircle, ArrowRight } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const LatestCommentsWidget = () => {
    const { data: comments, isLoading } = useQuery({
        queryKey: ['latest-comments'],
        queryFn: getLatestComments,
        refetchInterval: 30000,
    });

    return (
        <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-primary" />
                    Bình luận mới nhất
                </CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center py-6">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : comments && comments.length > 0 ? (
                    <div className="space-y-4">
                        {comments.map((comment) => (
                            <div key={comment.id} className="flex gap-3 group relative">
                                <div className="absolute left-[19px] top-10 bottom-0 w-px bg-border/50 group-last:hidden" />
                                <Avatar className="w-10 h-10 border-2 border-background shrink-0">
                                    <AvatarImage src={comment.user.profilePicture || undefined} />
                                    <AvatarFallback>{comment.user.displayName?.[0] || 'U'}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline justify-between mb-1">
                                        <span className="font-medium text-sm truncate mr-2">
                                            {comment.user.displayName}
                                        </span>
                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                            {formatRelativeTime(comment.createdAt)}
                                        </span>
                                    </div>

                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2 break-all">
                                        {comment.content}
                                    </p>

                                    {comment.chapterId ? (
                                        <Link
                                            to="/chapter/$chapterId"
                                            params={{ chapterId: comment.chapterId }}
                                            className="inline-flex items-center text-xs text-primary hover:underline group/link"
                                        >
                                            Xem tại chương này
                                            <ArrowRight className="w-3 h-3 ml-1 transition-transform group-hover/link:translate-x-0.5" />
                                        </Link>
                                    ) : (
                                        <Link
                                            to="/manga/$mangaId"
                                            params={{ mangaId: comment.mangaId }}
                                            className="inline-flex items-center text-xs text-primary hover:underline group/link"
                                        >
                                            Xem tại truyện này
                                            <ArrowRight className="w-3 h-3 ml-1 transition-transform group-hover/link:translate-x-0.5" />
                                        </Link>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-muted-foreground py-6 text-sm">
                        Chưa có bình luận nào.
                    </p>
                )}
            </CardContent>
        </Card>
    );
};
