import { motion } from 'framer-motion'
import { MdStar } from 'react-icons/md'
import LazyImage from '../common/LazyImage'

function StarRating({ rating, size = 'md' }) {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <MdStar
          key={i}
          className={`${sizeClass} ${i < rating ? 'text-gold' : 'text-gray-300'}`}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

export default function ReviewCard({ review, index }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-accent"
    >
      <div className="flex items-start gap-4 mb-4">
        <LazyImage
          src={review.image}
          alt={`${review.name} profile`}
          className="w-14 h-14 rounded-full object-cover"
          wrapperClassName="w-14 h-14 rounded-full shrink-0"
        />
        <div className="flex-1">
          <h3 className="font-bold text-primary">{review.name}</h3>
          <p className="text-sm text-gold">{review.treatment}</p>
          <p className="text-xs text-primary/40 mt-0.5">
            {new Date(review.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <StarRating rating={review.rating} />
      </div>
      <p className="text-primary/70 leading-relaxed italic">&ldquo;{review.text}&rdquo;</p>
    </motion.article>
  )
}

export { StarRating }
