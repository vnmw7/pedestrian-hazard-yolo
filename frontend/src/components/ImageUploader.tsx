import { UploadCloud } from "lucide-react";
import type React from "react";
import { useCallback, useState } from "react";

interface ImageUploaderProps {
	onFileSelected: (file: File) => void;
	disabled?: boolean;
}

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
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
			if (file.size > MAX_SIZE) {
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
				className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-2xl transition-all duration-200 ${
					disabled
						? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
						: isDragging
							? "cursor-pointer border-indigo-500 bg-indigo-50 scale-[1.01]"
							: "cursor-pointer border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-indigo-400"
				}`}
			>
				<div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4 pointer-events-none">
					<UploadCloud
						className={`w-12 h-12 mb-4 transition-colors ${
							disabled
								? "text-slate-300"
								: isDragging
									? "text-indigo-500"
									: "text-slate-400"
						}`}
					/>
					<p className="mb-2 text-lg font-semibold text-slate-700">
						<span className="text-indigo-600">Click to upload</span> or drag and
						drop
					</p>
					<p className="text-sm text-slate-500 mb-1">
						Accepted formats: JPEG, PNG, WebP
					</p>
					<p className="text-sm font-medium text-slate-500">
						Maximum file size: 10 MB
					</p>
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
				<p className="mt-3 text-sm font-medium text-red-500 animate-in fade-in slide-in-from-top-1">
					{error}
				</p>
			)}
		</div>
	);
}
