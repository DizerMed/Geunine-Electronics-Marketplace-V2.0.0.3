import React, { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import {
  GripVertical,
  Star,
  Eye,
  X,
  Upload,
  UploadCloud,
  ImagePlus,
  ArrowLeftRight,
  RefreshCw,
  Sparkles,
  ZoomIn,
  CheckCircle,
  Move,
  Link,
} from "lucide-react";
import {
  CategoryItem,
  Product,
  Order,
  POSTransaction,
  Staff,
  UserProfile,
  StoreSettings,
} from "../types";

interface HeroImageDropzoneProps {
  processAndUploadImage?: (file: File, oldUrl?: string) => Promise<string>;
  formImage: string;
  activeDragImage: string | null;
  isUploading: boolean;
  onImageChange: (url: string) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSwapWithFirstGallery?: () => void;
  hasGalleryImages: boolean;
  isDark: boolean;
  inputBg: string;
  textSub: string;
  onPreview?: (url: string) => void;
}

interface SortableImageItemProps {
  id: string;
  img: string;
  idx: number;
  totalImages?: number;
  onRemove: (index: number) => void;
  onMoveLeft?: (index: number) => void;
  onMoveRight?: (index: number) => void;
  onSetAsMain?: (img: string, index: number) => void;
  onPreview?: (img: string) => void;
  isDark: boolean;
}

const SortableImageItem: React.FC<SortableImageItemProps> = ({ id, img, idx, totalImages = 1, onRemove, onSetAsMain, onPreview, isDark }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.42 : undefined,
  };

  const isPrimary = idx === 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative aspect-square overflow-hidden rounded-[1.35rem] border bg-white p-1.5 shadow-sm transition-all duration-200 touch-none select-none dark:bg-slate-900 ${
        isDragging
          ? 'scale-[1.04] border-blue-500 shadow-2xl ring-4 ring-blue-500/25'
          : isDark
            ? 'border-slate-800 hover:-translate-y-0.5 hover:border-slate-700 hover:shadow-xl'
            : 'border-slate-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-xl'
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        aria-label={`Drag gallery image ${idx + 1} to reorder`}
        className="relative flex h-full w-full cursor-grab items-center justify-center overflow-hidden rounded-[1rem] bg-[radial-gradient(circle_at_50%_35%,rgba(148,163,184,0.10),transparent_60%)] active:cursor-grabbing"
      >
        <img
          src={img}
          alt={`Gallery image ${idx + 1}`}
          className={`h-full w-full rounded-[0.85rem] object-contain transition-transform duration-300 ${isDragging ? 'scale-105' : 'group-hover:scale-[1.025]'}`}
          loading="lazy"
        />

        {/* Persistent visual affordances — no hover-only instruction overlay. */}
        <div className="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between">
          <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-slate-950/75 px-2 py-1 text-[10px] font-black text-white shadow-lg backdrop-blur-md">
            <GripVertical className="h-3 w-3 text-blue-300" />
            <span>{idx + 1}</span>
          </div>
          {isPrimary && (
            <div className="flex items-center gap-1 rounded-full border border-amber-300/30 bg-amber-400 px-2 py-1 text-[9px] font-black text-slate-950 shadow-lg">
              <Star className="h-3 w-3 fill-slate-950" />
              MAIN
            </div>
          )}
        </div>

        {/* Compact controls remain visible so the editor never depends on mouse-over labels. */}
        <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-1 opacity-100">
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-slate-950/70 p-1 shadow-lg backdrop-blur-md">
            {onPreview && (
              <button
                type="button"
                aria-label="Preview image"
                onClick={(e) => { e.stopPropagation(); onPreview(img); }}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-white transition hover:bg-blue-600 active:scale-95"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
            )}
            {onSetAsMain && !isPrimary && (
              <button
                type="button"
                aria-label="Set image as main cover"
                onClick={(e) => { e.stopPropagation(); onSetAsMain(img, idx); }}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-amber-300 transition hover:bg-amber-400 hover:text-slate-950 active:scale-95"
              >
                <Star className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            aria-label="Remove image from gallery"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onRemove(idx); }}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-rose-300/30 bg-rose-600 text-white shadow-lg transition hover:scale-105 hover:bg-rose-500 active:scale-90"
          >
            <X className="h-4 w-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      

    </div>
  );
};

interface HeroImageDropzoneProps {

  formImage: string;

  activeDragImage: string | null;

  isUploading: boolean;

  onImageChange: (url: string) => void;

  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;

  onSwapWithFirstGallery?: () => void;

  hasGalleryImages: boolean;

  isDark: boolean;

  inputBg: string;

  textSub: string;

  onPreview?: (url: string) => void;

}



const HeroImageDropzone: React.FC<HeroImageDropzoneProps> = ({
  processAndUploadImage,

  formImage,

  activeDragImage,

  isUploading,

  onImageChange,

  onFileUpload,

  onSwapWithFirstGallery,

  hasGalleryImages,

  isDark,

  inputBg,

  textSub,

  onPreview,

}) => {

  const { setNodeRef, isOver } = useDroppable({

    id: 'main-hero-dropzone',

  });



  const [isDesktopDraggingOver, setIsDesktopDraggingOver] = useState(false);



  const handleDragOver = (e: React.DragEvent) => {

    e.preventDefault();

    e.stopPropagation();

    setIsDesktopDraggingOver(true);

  };



  const handleDragLeave = (e: React.DragEvent) => {

    e.preventDefault();

    e.stopPropagation();

    setIsDesktopDraggingOver(false);

  };



  const handleDrop = async (e: React.DragEvent) => {

    e.preventDefault();

    e.stopPropagation();

    setIsDesktopDraggingOver(false);

    const files = e.dataTransfer.files;

    if (files && files.length > 0) {

      const file = files[0];

      try {

        if (processAndUploadImage) { const url = await processAndUploadImage(file, formImage); onImageChange(url); }


      } catch (err: any) {

        console.error('Failed to upload hero image via drag-drop:', err);

      }

    }

  };



  const isHighlighted = !!activeDragImage;



  return (

    <div

      ref={setNodeRef}

      onDragOver={handleDragOver}

      onDragLeave={handleDragLeave}

      onDrop={handleDrop}

      className={`relative rounded-3xl border-2 transition-all p-4 ${

        isOver

          ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-4 ring-emerald-500/30 scale-[1.01] shadow-xl'

          : isDesktopDraggingOver

            ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 ring-4 ring-blue-500/30'

            : isHighlighted

              ? 'border-amber-400 dark:border-amber-500/80 bg-amber-50/30 dark:bg-amber-950/20 border-dashed animate-pulse shadow-md'

              : isDark

                ? 'border-slate-800 bg-slate-900/60'

                : 'border-slate-200 bg-slate-50/80'

      }`}

    >

      {/* Header Bar with Status */}

      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">

        <div className="flex items-center gap-2">

          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-black uppercase tracking-wider">

            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />

            <span>Primary Front Cover (Main)</span>

          </span>

          <span className="text-[11px] text-slate-400 hidden sm:inline-block">

            Displayed on Storefront Cards & Catalog

          </span>

        </div>



        {hasGalleryImages && onSwapWithFirstGallery && (

          <button

            type="button"

            onClick={onSwapWithFirstGallery}

            className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center gap-1.5 transition-all"

            

          >

            <ArrowLeftRight className="w-3 h-3" />

            <span>Swap with Gallery #1</span>

          </button>

        )}

      </div>



      {/* Main Image Stage & Droppable Surface */}

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">

        {/* Visual Box */}

        <div className="sm:col-span-4 relative aspect-[4/3] rounded-[1.5rem] border-2 border-slate-200/80 bg-white p-2 overflow-hidden flex items-center justify-center group shadow-inner transition-all duration-200 dark:border-slate-700 dark:bg-slate-950">

          {formImage ? (
            <img
              src={formImage}
              alt="Main Front Cover"
              className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 text-center text-slate-400">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-500">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider">Drop cover image</span>
              </div>
          )}



          {/* Top-Right Quick Action Buttons (Enlarge Preview & X Clear Button) */}
          {formImage && (
            <div className="absolute top-2 right-2 flex items-center gap-1 z-20">
              {onPreview && (
                <button
                  type="button"
                  onClick={() => onPreview(formImage)}
                  className="p-1.5 rounded-xl bg-slate-950/70 hover:bg-blue-600 text-white transition-all backdrop-blur-sm shadow-md"
                  
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onImageChange('')}
                className="w-7 h-7 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-xl border border-rose-400/30 flex items-center justify-center transition-all hover:scale-110 active:scale-90"
                
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          )}



          {/* Dragging Active Overlay for dropping gallery image */}

          {isHighlighted && (

            <div className={`absolute inset-0 backdrop-blur-[2px] flex flex-col items-center justify-center p-2 text-center transition-all ${

              isOver 

                ? 'bg-emerald-600/90 text-white' 

                : 'bg-amber-500/90 text-slate-950'

            }`}>

              {isOver ? (

                <>

                  <CheckCircle className="w-8 h-8 animate-bounce mb-1 text-white" />

                  <span className="text-xs font-black uppercase tracking-wider">Release to Set as Front Cover!</span>

                </>

              ) : (

                <>

                  <Star className="w-7 h-7 animate-pulse mb-1 fill-slate-950 text-slate-950" />

                  <span className="text-xs font-black uppercase tracking-wider">Drop Here to Set as Front Cover</span>

                </>

              )}

            </div>

          )}



          {/* Uploading Progress Overlay */}

          {isUploading && (

            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-[2px] flex flex-col items-center justify-center text-center p-2">

              <RefreshCw className="w-7 h-7 text-blue-400 animate-spin mb-1" />

              <span className="text-[11px] font-bold text-white">Uploading Image...</span>

            </div>

          )}

        </div>



        {/* Action Controls & Input URL */}

        <div className="sm:col-span-8 space-y-2.5">

          <div className="flex flex-wrap items-center gap-2">

            <label className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all border flex items-center gap-2 shadow-sm ${

              isDark 

                ? 'bg-blue-600 hover:bg-blue-500 border-blue-500 text-white' 

                : 'bg-blue-600 hover:bg-blue-700 border-blue-600 text-white'

            }`}>

              <UploadCloud className="w-4 h-4" />

              <span>{isUploading ? 'Uploading...' : 'Upload New Front Image'}</span>

              <input

                type="file"

                accept="image/*"

                className="hidden"

                onChange={onFileUpload}

                disabled={isUploading}

              />

            </label>



            <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-blue-500/15 bg-blue-500/10 text-blue-500" aria-hidden="true">
              <Move className="h-4 w-4" />
            </span>

          </div>



          <div className="relative">

            <Link className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

            <input

              type="text"

              required

              value={formImage}

              onChange={(e) => onImageChange(e.target.value)}

              placeholder="https://images.unsplash.com/... or storage link"

              className={`w-full pl-9 pr-3.5 py-2 text-xs font-mono rounded-xl ${inputBg}`}

            />

          </div>



          <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">

            Tip: Drag any gallery photo directly onto this box to instantly switch your primary product cover photo.

          </p>

        </div>

      </div>

    </div>

  );

};



export { SortableImageItem, HeroImageDropzone };
