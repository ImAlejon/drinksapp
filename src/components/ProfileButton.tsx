'use client'

import { useState, useEffect } from 'react';
import { useSupabase } from './SupabaseProvider';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { User } from '@supabase/supabase-js';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useUserCredits } from '@/contexts/UserCreditsContext';

interface ProfileButtonProps {
  credits: number;
}

export default function ProfileButton({ credits }: ProfileButtonProps) {
	const { supabase } = useSupabase();
	const router = useRouter();
	const [user, setUser] = useState<User | null>(null);
	const { resetCredits } = useUserCredits();

	useEffect(() => {
		const fetchUser = async () => {
			const { data: { user } } = await supabase.auth.getUser();
			setUser(user);
		};
		fetchUser();
	}, [supabase]);

	const handleLogout = async () => {
		await supabase.auth.signOut();
		resetCredits(); // Reset credits to 0
		router.push('/login');
	};

	if (!user) return null;

	return (
		<div className="flex items-center">
			<div className="mr-4 bg-gray-200 rounded-full px-3 py-1">
				<span className="text-sm font-medium">{credits} credits</span>
			</div>
			<Popover>
				<PopoverTrigger asChild>
					<Button className="h-8 w-8 rounded-full p-0 overflow-hidden">
						<Image
							src={user.user_metadata.avatar_url || '/default-avatar.png'}
							alt="Profile"
							width={32}
							height={32}
							className="h-full w-full object-cover"
						/>
					</Button>
				</PopoverTrigger>

				<PopoverContent className="w-56" align="end">
					<div className="mb-2 px-2 py-1 text-sm text-gray-700">
						{user.email}
					</div>
					<Button
						variant="ghost"
						className="w-full justify-start"
						onClick={handleLogout}
					>
						Logout
					</Button>
				</PopoverContent>
			</Popover>
		</div>
	);
}
