/**
 * System: Pedestrian Hazard YOLO
 * Module: Image Uploader
 * File URL: frontend/src/components/ImageUploader.tsx
 * Purpose: Validate and select local images for hazard detection
 */
import { UploadCloud } from "lucide-react";
import type React from "react";
import { useCallback, useState } from "react";

interface ImageUploaderProps {
	onFileSelected: (file: File) => void;
	disabled?: boolean;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function ImageUploader({
	onFileSelected,
	disabled = false,
}: ImageUploaderProps) {
	const [isDragging, setIsDragging] = useState(false);
	const [error, setError] = useState<string>();

	const handleDrag = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			if (disabled) return;

			if (e.type === "dragenter" || e.type === "dragover") {
				setIsDragging(true);
			} else if (e.type === "dragleave") {
				setIsDragging(false);
			}
		},
		[disabled],
	);

	const validateAndProcessFile = useCallback(
		(file: File) => {
			setError(undefined);
			if (!ACCEPTED_TYPES.includes(file.type)) {
				setError(
					"Invalid file type. Please upload a JPEG, PNG, or WebP image.",
				);
				return;
			}
			if (file.size > MAX_FILE_SIZE_BYTES) {
				setError("File size exceeds the 10 MB maximum limit.");
				return;
			}
			onFileSelected(file);
		},
		[onFileSelected],
	);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			if (disabled) return;

			setIsDragging(false);
			if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
				validateAndProcessFile(e.dataTransfer.files[0]);
			}
		},
		[disabled, validateAndProcessFile],
	);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (disabled) return;

		if (e.target.files && e.target.files.length > 0) {
			validateAndProcessFile(e.target.files[0]);
		}
	};

	return (
		<div className="w-full">
			<label
				onDragEnter={handleDrag}
				onDragLeave={handleDrag}
				onDragOver={handleDrag}
				onDrop={handleDrop}
				className={`flex h-80 w-full flex-col items-center justify-center rounded-3xl border border-dashed transition-all duration-200 ${
					disabled
						? "cursor-not-allowed border-zinc-200 bg-white/50 opacity-60"
						: isDragging
							? "scale-[1.01] cursor-pointer border-zinc-950 bg-white"
							: "cursor-pointer border-zinc-300 bg-white/75 hover:border-zinc-500 hover:bg-white"
				}`}
			>
				<div className="pointer-events-none flex flex-col items-center justify-center px-4 text-center">
					<div className="mb-5 flex size-12 items-center justify-center rounded-full bg-zinc-950 text-white shadow-lg shadow-zinc-950/15">
						<UploadCloud aria-hidden="true" className="size-5" />
					</div>
					<p className="mb-2 text-base font-semibold tracking-tight text-zinc-900">
						Drop an image or browse
					</p>
					<p className="text-sm text-zinc-500">JPEG, PNG or WebP · 10 MB max</p>
				</div>
				<input
					type="file"
					className="hidden"
					accept="image/jpeg, image/png, image/webp"
					onChange={handleChange}
					disabled={disabled}
				/>
			</label>
			{error && (
				<p className="mt-3 text-sm font-medium text-red-600 animate-in fade-in slide-in-from-top-1">
					{error}
				</p>
			)}
		</div>
	);
}
