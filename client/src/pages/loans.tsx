import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CreditCard, TrendingUp, Clock, CheckCircle, ExternalLink, DollarSign, Users, Building } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const preQualificationSchema = z.object({
  loanPurpose: z.string().min(1, "Loan purpose is required"),
  amountRequested: z.string().min(1, "Loan amount is required"),
  currency: z.string().default("USD"),
  creditScore: z.number().min(300).max(850).optional(),
  employmentStatus: z.enum(["employed", "self_employed", "unemployed", "retired", "student"]),
  monthlyIncome: z.string().optional(),
  existingDebt: z.string().optional(),
  collateralValue: z.string().optional(),
  loanTerm: z.number().min(1).max(360).optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  additionalInfo: z.any().optional(),
});

type PreQualificationForm = z.infer<typeof preQualificationSchema>;

export default function LoansPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: preQualifications = [], isLoading: isLoadingPreQuals } = useQuery({
    queryKey: ['/api/loans/my-pre-qualifications'],
  });

  const { data: referrals = [], isLoading: isLoadingReferrals } = useQuery({
    queryKey: ['/api/loans/my-referrals'],
  });

  const form = useForm<PreQualificationForm>({
    resolver: zodResolver(preQualificationSchema),
    defaultValues: {
      loanPurpose: '',
      amountRequested: '10000',
      currency: 'USD',
      creditScore: 650,
      employmentStatus: 'employed',
      monthlyIncome: '4000',
      existingDebt: '0',
      collateralValue: '0',
      loanTerm: 60,
      country: 'US',
      state: '',
      city: '',
    },
  });

  const createPreQualificationMutation = useMutation({
    mutationFn: async (data: PreQualificationForm) => {
      const response = await fetch('/api/loans/pre-qualify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to create pre-qualification');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/loans/my-pre-qualifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/loans/my-referrals'] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Pre-qualification submitted",
        description: "We're finding the best loan matches for you.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit pre-qualification. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PreQualificationForm) => {
    createPreQualificationMutation.mutate(data);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'matched': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getReferralStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'clicked': return 'bg-blue-100 text-blue-800';
      case 'applied': return 'bg-purple-100 text-purple-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'funded': return 'bg-emerald-100 text-emerald-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Loan Center</h1>
          <p className="text-gray-600 mt-2">Find the perfect loan for your needs with our AI-powered matching system</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <CreditCard className="w-4 h-4 mr-2" />
              Get Pre-Qualified
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Loan Pre-Qualification</DialogTitle>
              <DialogDescription>
                Fill out this form to get matched with the best loan offers for your situation.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="amountRequested"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Loan Amount ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="10000"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="loanPurpose"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Loan Purpose</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select purpose" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="personal">Personal</SelectItem>
                            <SelectItem value="business">Business</SelectItem>
                            <SelectItem value="home_improvement">Home Improvement</SelectItem>
                            <SelectItem value="debt_consolidation">Debt Consolidation</SelectItem>
                            <SelectItem value="auto">Auto</SelectItem>
                            <SelectItem value="education">Education</SelectItem>
                            <SelectItem value="medical">Medical</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="monthlyIncome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Income ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="4000"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="creditScore"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Credit Score</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="650"
                            min="300"
                            max="850"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="employmentStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employment Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="employed">Employed</SelectItem>
                            <SelectItem value="self_employed">Self-Employed</SelectItem>
                            <SelectItem value="unemployed">Unemployed</SelectItem>
                            <SelectItem value="retired">Retired</SelectItem>
                            <SelectItem value="student">Student</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="existingDebt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Existing Debt ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="0"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="loanTerm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Loan Term (months)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="60"
                            min="1"
                            max="360"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="US"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="collateralValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Collateral Value (Optional) ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createPreQualificationMutation.isPending}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {createPreQualificationMutation.isPending ? "Submitting..." : "Submit Pre-Qualification"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="applications">My Applications</TabsTrigger>
          <TabsTrigger value="referrals">Loan Matches</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{preQualifications.length}</div>
                <p className="text-xs text-muted-foreground">
                  Pre-qualification requests
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Matches</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{referrals.filter((r: any) => r.status === 'pending' || r.status === 'clicked').length}</div>
                <p className="text-xs text-muted-foreground">
                  Partner referrals active
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {referrals.length > 0 ? Math.round((referrals.filter((r: any) => r.status === 'approved' || r.status === 'funded').length / referrals.length) * 100) : 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Applications approved
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>How Our Loan Matching Works</CardTitle>
              <CardDescription>
                Our AI-powered system connects you with the best loan partners based on your financial profile
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-blue-50">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-white font-bold">1</span>
                  </div>
                  <h3 className="font-semibold mb-2">Submit Application</h3>
                  <p className="text-sm text-gray-600">Complete our secure pre-qualification form with your financial details</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-purple-50">
                  <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-white font-bold">2</span>
                  </div>
                  <h3 className="font-semibold mb-2">AI Matching</h3>
                  <p className="text-sm text-gray-600">Our system matches you with the best loan partners for your needs</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-green-50">
                  <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-white font-bold">3</span>
                  </div>
                  <h3 className="font-semibold mb-2">Get Offers</h3>
                  <p className="text-sm text-gray-600">Receive personalized loan offers from our trusted partners</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applications" className="space-y-6">
          {isLoadingPreQuals ? (
            <div className="text-center py-8">Loading applications...</div>
          ) : preQualifications.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Applications Yet</h3>
                <p className="text-gray-600 mb-4">Get started by submitting your first pre-qualification application</p>
                <Button onClick={() => setIsDialogOpen(true)} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  Get Pre-Qualified
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {preQualifications.map((preQual: any) => (
                <Card key={preQual.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          ${preQual.loanAmount?.toLocaleString()} - {preQual.loanPurpose}
                          <Badge className={getStatusColor(preQual.status)}>
                            {preQual.status}
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          Applied on {new Date(preQual.createdAt).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Credit Score</p>
                        <p className="font-semibold">{preQual.creditScore}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Annual Income</p>
                        <p className="font-semibold">${preQual.annualIncome?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Employment</p>
                        <p className="font-semibold capitalize">{preQual.employmentStatus?.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Debt-to-Income</p>
                        <p className="font-semibold">{preQual.debtToIncomeRatio}%</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Matches Found</p>
                        <p className="font-semibold">{referrals.filter((r: any) => r.preQualificationId === preQual.id).length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="referrals" className="space-y-6">
          {isLoadingReferrals ? (
            <div className="text-center py-8">Loading matches...</div>
          ) : referrals.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Matches Yet</h3>
                <p className="text-gray-600 mb-4">Submit a pre-qualification to get matched with loan partners</p>
                <Button onClick={() => setIsDialogOpen(true)} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  Get Pre-Qualified
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {referrals.map((referral: any) => (
                <Card key={referral.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {referral.partnerName}
                          <Badge className={getReferralStatusColor(referral.status)}>
                            {referral.status}
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          Match Score: {referral.matchScore}% • Created {new Date(referral.createdAt).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      {referral.estimatedRate && (
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Est. Rate</p>
                          <p className="font-semibold">{referral.estimatedRate}%</p>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {referral.matchReasons && referral.matchReasons.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2">Why This Match:</h4>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {referral.matchReasons.map((reason: string, index: number) => (
                              <li key={index} className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                {reason}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-600">
                          {referral.clickedAt && (
                            <p>Clicked: {new Date(referral.clickedAt).toLocaleDateString()}</p>
                          )}
                          {referral.commission && (
                            <p>Commission: ${referral.commission}</p>
                          )}
                        </div>
                        {referral.referralLink && referral.status === 'pending' && (
                          <Button asChild className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                            <a href={referral.referralLink} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Apply Now
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}