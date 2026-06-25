function buildFreelancerReviewStats(reviews = [], freelancerEmail = "") {
  const normalizedEmail = String(freelancerEmail || "").trim().toLowerCase();

  if (!normalizedEmail) {
    return {
      rating: 0,
      reviewCount: 0,
      finishedJobs: 0,
    };
  }

  const stats = (reviews || []).reduce((acc, review) => {
    const revieweeEmail = String(
      review?.reviewee_email || review?.revieweeEmail || review?.reviewee?.email || ""
    )
      .trim()
      .toLowerCase();

    if (!revieweeEmail || revieweeEmail !== normalizedEmail) {
      return acc;
    }

    const rating = Number(review?.rating || 0);
    if (!Number.isFinite(rating)) {
      return acc;
    }

    return {
      total: acc.total + rating,
      count: acc.count + 1,
    };
  }, { total: 0, count: 0 });

  const reviewCount = stats.count;
  const averageRating = reviewCount ? Number((stats.total / reviewCount).toFixed(1)) : 0;

  return {
    rating: averageRating,
    reviewCount,
    finishedJobs: reviewCount,
  };
}

module.exports = {
  buildFreelancerReviewStats,
};
