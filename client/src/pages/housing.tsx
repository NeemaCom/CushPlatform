import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  MapPin, 
  Home, 
  DollarSign, 
  Bed, 
  Bath, 
  Calendar,
  Phone,
  Mail,
  Filter,
  Star,
  PawPrint,
  Wifi,
  Car,
  Coffee,
  Waves
} from 'lucide-react';
import { EnhancedSidebar } from '@/components/enhanced-sidebar';

interface HousingListing {
  id: number;
  userId?: number;
  title: string;
  address: string;
  city: string;
  country: string;
  postalCode?: string;
  rentAmount: number;
  currency: string;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  furnished: boolean;
  utilitiesIncluded: boolean;
  petsAllowed: boolean;
  availabilityDate: string;
  description: string;
  amenities: string[];
  photos: string[];
  contactEmail?: string;
  contactPhone?: string;
  area?: number;
  deposit?: number;
  minimumStay?: number;
  createdAt: string;
}

export default function Housing() {
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [bedroomsFilter, setBedroomsFilter] = useState('');
  const [furnishedFilter, setFurnishedFilter] = useState('');

  const { data: listings, isLoading } = useQuery<HousingListing[]>({
    queryKey: ['/api/housing', searchTerm, locationFilter, propertyTypeFilter, minPrice, maxPrice, bedroomsFilter, furnishedFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (locationFilter) params.append('location', locationFilter);
      if (propertyTypeFilter) params.append('propertyType', propertyTypeFilter);
      if (minPrice) params.append('minPrice', minPrice);
      if (maxPrice) params.append('maxPrice', maxPrice);
      if (bedroomsFilter) params.append('bedrooms', bedroomsFilter);
      if (furnishedFilter) params.append('furnished', furnishedFilter);
      
      const response = await fetch(`/api/housing?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch housing listings');
      return response.json();
    }
  });

  const formatRent = (amount: number, currency: string = 'USD') => {
    return `${currency} ${amount.toLocaleString()}/month`;
  };

  const formatAvailability = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    if (date <= now) return 'Available now';
    
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 7) return `Available in ${diffDays} days`;
    if (diffDays <= 30) return `Available in ${Math.ceil(diffDays / 7)} weeks`;
    return `Available from ${date.toLocaleDateString()}`;
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setLocationFilter('');
    setPropertyTypeFilter('');
    setMinPrice('');
    setMaxPrice('');
    setBedroomsFilter('');
    setFurnishedFilter('');
  };

  const getAmenityIcon = (amenity: string) => {
    const amenityLower = amenity.toLowerCase();
    if (amenityLower.includes('wifi') || amenityLower.includes('internet')) return <Wifi className="h-4 w-4" />;
    if (amenityLower.includes('parking') || amenityLower.includes('garage')) return <Car className="h-4 w-4" />;
    if (amenityLower.includes('pool') || amenityLower.includes('swimming')) return <Waves className="h-4 w-4" />;
    if (amenityLower.includes('gym') || amenityLower.includes('fitness')) return <Coffee className="h-4 w-4" />;
    return <Star className="h-4 w-4" />;
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <EnhancedSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Housing Discovery Board</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Find affordable and suitable housing options for immigrants and international residents
              </p>
            </div>

            {/* Search and Filters */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Search className="h-5 w-5 mr-2" />
                  Search & Filter Housing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by location, neighborhood, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Filter Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                  <div>
                    <Label>Location</Label>
                    <Select value={locationFilter} onValueChange={setLocationFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Any location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Any location</SelectItem>
                        <SelectItem value="United States">United States</SelectItem>
                        <SelectItem value="Canada">Canada</SelectItem>
                        <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                        <SelectItem value="Germany">Germany</SelectItem>
                        <SelectItem value="Australia">Australia</SelectItem>
                        <SelectItem value="Netherlands">Netherlands</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Property Type</Label>
                    <Select value={propertyTypeFilter} onValueChange={setPropertyTypeFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Any type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Any type</SelectItem>
                        <SelectItem value="room">Room</SelectItem>
                        <SelectItem value="studio">Studio</SelectItem>
                        <SelectItem value="apartment">Apartment</SelectItem>
                        <SelectItem value="house">House</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Bedrooms</Label>
                    <Select value={bedroomsFilter} onValueChange={setBedroomsFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Any</SelectItem>
                        <SelectItem value="0">Studio</SelectItem>
                        <SelectItem value="1">1 Bedroom</SelectItem>
                        <SelectItem value="2">2 Bedrooms</SelectItem>
                        <SelectItem value="3">3 Bedrooms</SelectItem>
                        <SelectItem value="4">4+ Bedrooms</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Min Price</Label>
                    <Input
                      placeholder="Min rent"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      type="number"
                    />
                  </div>

                  <div>
                    <Label>Max Price</Label>
                    <Input
                      placeholder="Max rent"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      type="number"
                    />
                  </div>

                  <div>
                    <Label>Furnished</Label>
                    <Select value={furnishedFilter} onValueChange={setFurnishedFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Any</SelectItem>
                        <SelectItem value="true">Furnished</SelectItem>
                        <SelectItem value="false">Unfurnished</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-end">
                    <Button 
                      variant="outline" 
                      onClick={clearAllFilters}
                      className="w-full"
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Clear
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Housing Listings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {isLoading ? (
                // Loading skeleton
                Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-32 w-full mb-4" />
                      <Skeleton className="h-16 w-full" />
                    </CardContent>
                  </Card>
                ))
              ) : listings && listings.length > 0 ? (
                listings.map((listing) => (
                  <Card key={listing.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{listing.title}</CardTitle>
                          <CardDescription className="flex items-center mt-1">
                            <MapPin className="h-4 w-4 mr-1" />
                            {listing.address}, {listing.city}, {listing.country}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-green-600">
                            {formatRent(listing.rentAmount, listing.currency)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {listing.deposit && `${listing.currency} ${listing.deposit} deposit`}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Property Details */}
                      <div className="flex flex-wrap gap-4">
                        <div className="flex items-center">
                          <Home className="h-4 w-4 mr-1 text-blue-600" />
                          <span className="text-sm capitalize">{listing.propertyType}</span>
                        </div>
                        <div className="flex items-center">
                          <Bed className="h-4 w-4 mr-1 text-purple-600" />
                          <span className="text-sm">
                            {listing.bedrooms === 0 ? 'Studio' : `${listing.bedrooms} bed`}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Bath className="h-4 w-4 mr-1 text-cyan-600" />
                          <span className="text-sm">{listing.bathrooms} bath</span>
                        </div>
                        {listing.area && (
                          <div className="flex items-center">
                            <span className="text-sm">{listing.area} m²</span>
                          </div>
                        )}
                      </div>

                      {/* Badges */}
                      <div className="flex flex-wrap gap-2">
                        {listing.furnished && (
                          <Badge variant="secondary">Furnished</Badge>
                        )}
                        {listing.utilitiesIncluded && (
                          <Badge variant="secondary">Utilities Included</Badge>
                        )}
                        {listing.petsAllowed && (
                          <Badge variant="secondary" className="flex items-center">
                            <PawPrint className="h-3 w-3 mr-1" />
                            Pet Friendly
                          </Badge>
                        )}
                        <Badge variant="outline">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatAvailability(listing.availabilityDate)}
                        </Badge>
                      </div>

                      {/* Description */}
                      <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3">
                        {listing.description}
                      </p>

                      {/* Amenities */}
                      {listing.amenities && listing.amenities.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Amenities:</p>
                          <div className="flex flex-wrap gap-1">
                            {listing.amenities.slice(0, 4).map((amenity, index) => (
                              <Badge key={index} variant="outline" className="text-xs flex items-center">
                                {getAmenityIcon(amenity)}
                                <span className="ml-1">{amenity}</span>
                              </Badge>
                            ))}
                            {listing.amenities.length > 4 && (
                              <Badge variant="outline" className="text-xs">
                                +{listing.amenities.length - 4} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      <Separator />

                      {/* Contact and Actions */}
                      <div className="flex justify-between items-center">
                        <div className="space-y-1">
                          {listing.minimumStay && (
                            <p className="text-xs text-gray-500">
                              Min stay: {listing.minimumStay} months
                            </p>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          {listing.contactEmail && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={`mailto:${listing.contactEmail}`}>
                                <Mail className="h-4 w-4 mr-1" />
                                Email
                              </a>
                            </Button>
                          )}
                          {listing.contactPhone && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={`tel:${listing.contactPhone}`}>
                                <Phone className="h-4 w-4 mr-1" />
                                Call
                              </a>
                            </Button>
                          )}
                          <Button size="sm">
                            View Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full">
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Home className="h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        No housing found
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 text-center">
                        Try adjusting your search criteria or check back later for new listings.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}