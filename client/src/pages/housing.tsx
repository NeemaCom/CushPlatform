import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Calendar, DollarSign, Home, Search, Plus, Bed, Bath, Car } from 'lucide-react';
import { HousingListing, SearchHousingQuery, InsertHousingListing } from '@shared/schema';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

const createHousingSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  location: z.string().min(1, 'Location is required'),
  propertyType: z.enum(['apartment', 'house', 'condo', 'room']),
  rent: z.string().min(1, 'Rent is required'),
  deposit: z.string().optional(),
  bedrooms: z.number().min(0),
  bathrooms: z.number().min(0),
  squareFootage: z.number().optional(),
  amenities: z.string().optional(),
  petPolicy: z.string().optional(),
  availabilityDate: z.string().min(1, 'Availability date is required'),
  contactInfo: z.string().min(1, 'Contact information is required'),
  images: z.string().optional(),
});

type CreateHousingForm = z.infer<typeof createHousingSchema>;

export default function Housing() {
  const [searchQuery, setSearchQuery] = useState<SearchHousingQuery>({
    location: '',
    propertyType: 'apartment',
    minRent: undefined,
    maxRent: undefined,
    minBedrooms: undefined,
    minBathrooms: undefined,
    petFriendly: undefined,
    page: 1,
    limit: 10
  });

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: housing, isLoading, error } = useQuery<HousingListing[]>({
    queryKey: ['/api/housing/search', searchQuery],
    enabled: true
  });

  const { data: myListings } = useQuery<HousingListing[]>({
    queryKey: ['/api/housing/my-listings'],
    enabled: true
  });

  const createHousingMutation = useMutation({
    mutationFn: async (data: CreateHousingForm) => {
      const housingData: InsertHousingListing = {
        ...data,
        rent: data.rent,
        deposit: data.deposit || null,
        squareFootage: data.squareFootage || null,
        amenities: data.amenities ? data.amenities.split(',').map(a => a.trim()) : null,
        petPolicy: data.petPolicy || null,
        availabilityDate: data.availabilityDate,
        contactInfo: data.contactInfo,
        images: data.images ? data.images.split(',').map(i => i.trim()) : null,
      };
      return apiRequest('/api/housing', 'POST', housingData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/housing/search'] });
      queryClient.invalidateQueries({ queryKey: ['/api/housing/my-listings'] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Housing listing created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create housing listing",
        variant: "destructive",
      });
    }
  });

  const form = useForm<CreateHousingForm>({
    resolver: zodResolver(createHousingSchema),
    defaultValues: {
      title: '',
      description: '',
      location: '',
      propertyType: 'apartment',
      rent: '',
      deposit: '',
      bedrooms: 1,
      bathrooms: 1,
      squareFootage: undefined,
      amenities: '',
      petPolicy: '',
      availabilityDate: '',
      contactInfo: '',
      images: '',
    }
  });

  const handleSearch = (updates: Partial<SearchHousingQuery>) => {
    setSearchQuery(prev => ({ ...prev, ...updates, page: 1 }));
  };

  const formatPropertyType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const onSubmit = (data: CreateHousingForm) => {
    createHousingMutation.mutate(data);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Housing Discovery</h1>
            <p className="text-gray-600 dark:text-gray-400">Find your perfect home</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                List Property
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Housing Listing</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Beautiful 2BR apartment..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. New York, NY" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe your property..." 
                            className="min-h-[100px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="propertyType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Property Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="apartment">Apartment</SelectItem>
                              <SelectItem value="house">House</SelectItem>
                              <SelectItem value="condo">Condo</SelectItem>
                              <SelectItem value="room">Room</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="rent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monthly Rent</FormLabel>
                          <FormControl>
                            <Input placeholder="2500" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="deposit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Security Deposit</FormLabel>
                          <FormControl>
                            <Input placeholder="2500" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="bedrooms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bedrooms</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="bathrooms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bathrooms</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0"
                              step="0.5"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="squareFootage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Square Footage</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="1200"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="amenities"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amenities (comma-separated)</FormLabel>
                          <FormControl>
                            <Input placeholder="Pool, Gym, Parking, AC" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="petPolicy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pet Policy</FormLabel>
                          <FormControl>
                            <Input placeholder="Cats and dogs allowed" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="availabilityDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Availability Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="contactInfo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Information</FormLabel>
                          <FormControl>
                            <Input placeholder="Email or phone number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="images"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image URLs (comma-separated)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createHousingMutation.isPending}
                    >
                      {createHousingMutation.isPending ? 'Creating...' : 'Create Listing'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and Filter Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Housing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Location</label>
                <Input
                  placeholder="e.g. New York, NY"
                  value={searchQuery.location || ''}
                  onChange={(e) => handleSearch({ location: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Property Type</label>
                <Select
                  value={searchQuery.propertyType}
                  onValueChange={(value) => handleSearch({ propertyType: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apartment">Apartment</SelectItem>
                    <SelectItem value="house">House</SelectItem>
                    <SelectItem value="condo">Condo</SelectItem>
                    <SelectItem value="room">Room</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Min Rent</label>
                <Input
                  type="number"
                  placeholder="e.g. 1000"
                  value={searchQuery.minRent || ''}
                  onChange={(e) => handleSearch({ 
                    minRent: e.target.value ? parseInt(e.target.value) : undefined 
                  })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Max Rent</label>
                <Input
                  type="number"
                  placeholder="e.g. 3000"
                  value={searchQuery.maxRent || ''}
                  onChange={(e) => handleSearch({ 
                    maxRent: e.target.value ? parseInt(e.target.value) : undefined 
                  })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Min Bedrooms</label>
                <Select
                  value={searchQuery.minBedrooms?.toString() || ''}
                  onValueChange={(value) => handleSearch({ 
                    minBedrooms: value ? parseInt(value) : undefined 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any</SelectItem>
                    <SelectItem value="0">Studio</SelectItem>
                    <SelectItem value="1">1+</SelectItem>
                    <SelectItem value="2">2+</SelectItem>
                    <SelectItem value="3">3+</SelectItem>
                    <SelectItem value="4">4+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Min Bathrooms</label>
                <Select
                  value={searchQuery.minBathrooms?.toString() || ''}
                  onValueChange={(value) => handleSearch({ 
                    minBathrooms: value ? parseFloat(value) : undefined 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any</SelectItem>
                    <SelectItem value="1">1+</SelectItem>
                    <SelectItem value="1.5">1.5+</SelectItem>
                    <SelectItem value="2">2+</SelectItem>
                    <SelectItem value="2.5">2.5+</SelectItem>
                    <SelectItem value="3">3+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Pet Friendly</label>
                <Select
                  value={searchQuery.petFriendly?.toString() || ''}
                  onValueChange={(value) => handleSearch({ 
                    petFriendly: value === 'true' ? true : value === 'false' ? false : undefined 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any</SelectItem>
                    <SelectItem value="true">Pet Friendly</SelectItem>
                    <SelectItem value="false">No Pets</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Section */}
      <div className="space-y-4">
        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Searching for housing...</p>
          </div>
        )}

        {error && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
            <CardContent className="pt-6">
              <p className="text-red-600 dark:text-red-400">
                Error loading housing. Please try again.
              </p>
            </CardContent>
          </Card>
        )}

        {housing && housing.length === 0 && !isLoading && (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                No housing found matching your criteria. Try adjusting your search.
              </p>
            </CardContent>
          </Card>
        )}

        {housing && housing.length > 0 && (
          <div className="grid gap-4">
            {housing.map((listing) => (
              <Card key={listing.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                        {listing.title}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Home className="h-4 w-4" />
                          {formatPropertyType(listing.propertyType)}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {listing.city}, {listing.country}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Available {new Date(listing.availabilityDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        ${listing.rent}/mo
                      </div>
                      {listing.deposit && (
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          ${listing.deposit} deposit
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-3">
                    {listing.description}
                  </p>

                  <div className="flex items-center gap-6 mb-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Bed className="h-4 w-4" />
                      {listing.bedrooms} {listing.bedrooms === 1 ? 'bed' : 'beds'}
                    </div>
                    <div className="flex items-center gap-1">
                      <Bath className="h-4 w-4" />
                      {listing.bathrooms} {listing.bathrooms === 1 ? 'bath' : 'baths'}
                    </div>
                    {listing.squareFeet && (
                      <div className="flex items-center gap-1">
                        <Home className="h-4 w-4" />
                        {listing.squareFeet.toLocaleString()} sq ft
                      </div>
                    )}
                  </div>

                  {listing.amenities && listing.amenities.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Amenities:
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {listing.amenities.slice(0, 4).map((amenity, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {amenity}
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

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {listing.petPolicy && (
                        <Badge variant="secondary" className="text-xs">
                          Pet Policy: {listing.petPolicy}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                      <Button size="sm">
                        Contact
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* My Listings Section */}
      {myListings && myListings.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Listings</h2>
          <div className="grid gap-4">
            {myListings.map((listing) => (
              <Card key={listing.id} className="border-blue-200">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {listing.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {listing.location} • ${listing.rent}/mo
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm">
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}