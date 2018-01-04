//
//  CredentialProvider.h
//  CertificateProvider
//  Copyright (c) 2013 SAP. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import "CertificateProviderDelegate.h"

/**
 Common keys in the parameters dictionary.
 */
#define kCertificateProviderParameterKeyURL         @"url"
#define kCertificateProviderParameterKeyKeySize     @"keysize"
#define kCertificateProviderParameterKeyURLScheme   @"urlScheme"

/**
 Protocol defining an abstraction for certificate provisioning. The SDK ships with a couple of implementations, such as <code>AfariaCertificateProvider</code>,
 <code>FederationProvider</code> but application developers are free to create their own. Read on to understand the contracts.
 <p>
 There are multiple possible flows through which certificate provisioning is possible. This is the reason why all the methods of this protocol are optional.
 </p>
 <p>
 The asynchronous flow can be started using the <code>initialize:withCompletion:</code> method which will return the certificate via the completion block.
 </p>
 <p>
 Implementations which can provide a certificate without initialization may also implement the <code>getStoredCertificate:error:</code> method. Additionally,
 if the implementation allows for it, the <code>deleteStoredCertificateWithError:</code> method can be implemented to remove the stored certificate.
 </p>
 <p>
 Certain implementations might combine the two possible flows. This means that if a certificate is provisioned using the <code>initialize:withCompletion:</code>
 then later on this certificate can be retrieved using <code>getStoredCertificate:error:</code> as well. This is handy in situations when the asynchronous flow
 is used to display some kind of UI to ask input from the user after which the certificate can be acquired. Later on, the synchronous flow can be used to return
 the acquired certificate.
 </p>
 <p>
 The semantics of the option dictionary of <code>initialize:withCompletion:</code> as well as the semantics of the parameter dictionary that can be accessed via
 <code>getParameters</code> and <code>setParameters:failedWithError:</code> are implementation-dependent. Read the documentation of the implementation class to
 understand how and what they are used for. Being optional, an implementation might not even require options and parameters to function.
 </p>
 <p>
 By convention, all certificate provider implementations should support the default <code>init</code> method as there are components in the SDK which instantiate
 providers dynamically via introspection.
 </p>
 <p>
 The <code>getProviderID:</code> method is required if one wants to use certificate providers together with the Kapsel SDK.
 </p>
 */
@protocol CertificateProvider <NSObject>

@optional

/** 
 Asynchronous method to provision a certificate, the completion block can be called to return the result. Implementations employ whatever
 mechanism that is necessary to acquire the certificate. For example, an implementation may start a UI flow and invoke the specified block
 when that completes.

 @param option key/value map of the parameters the provider needs, provider-specific, can be nil
 @param completion a completion block which should be called on completion of the asynchronous operation be it successful or not, must be non-nil
 */
-(void)initialize:(NSDictionary*)option withCompletion:(void(^)(SecIdentityRef identityRef, NSError* error))completion;

/**
 Returns the unique certificate provider ID for the current provider. It is suggested to use reverse domain format for example
 <code>com.sap.CertProvider</code>. This is needed only if the provider is to be integrated with the Kapsel SDK.

 @return the unique ID of the provider, must be non-nil
 */
-(NSString*)getProviderID;

/**
 Method to synchronously get a certificate from a saved local copy. If saved certicate exists, returns YES and outputs the certificate via the
 <code>identityRef</code> parameter. If no saved certificate exists the NO is returned and the output parameter is set to nil. If error happens during getting
 the saved certificate, NO is returned with the related error. The value pointed to by the <code>identityRef</code> parameter is set to nil in this case as well.
 <p>
 If this provider also implements <code>initialize:withCompetion:</code> and a certificate has already been retrieved using that method then this method is
 expected to return that certificate. In other words, a certificate provider implementing both the asynchronous and the synchronous flow is expected to return
 the certificate in the latter which has been acquired during the former.
 </p>

 @param identityRef output parameter pointing to the value that will receive the certificate or nil, must be non-nil
 @param anError pointer to the error to set if a problem occurs, can be nil
 @return YES if the invocation was successful and a certificate was returned NO otherwise
 */
-(BOOL)getStoredCertificate:(SecIdentityRef*)identityRef error:(NSError**)anError;

/**
 Method to delete the saved local copy. If not saved certificate exists then does nothing and return YES. If saved certificate is
 deleted then returns YES. If saved certificate exists and removal fails then NO is returned and the error is set.

 @param anError pointer to the error object using which errors can be returned, can be nil
 @return YES if the method executed successfully, NO otherwise
 */
-(BOOL)deleteStoredCertificateWithError:(NSError**)anError;

/**
 This method is deprecated and should not be used.
 
 @deprecated since v3.8.0. This selector is deprecated and obsolite. Please use <code>initialize:withCompletion</code> selector instead
 */
-(void)getCertificate:(id<CertificateProviderDelegate>)delegate __attribute__ ((deprecated));

/**
 Returns the parameters of this provider to the caller. This can be useful in case the provider would like the caller to cache or store session data securely.
 For instance the caller application already implements a Secure Storage that can be used to store pin or other information between sessions.
 The <code>setParameters:failedWithError:</code> method or the <code>initialize:withCompletion:</code> methods can then be used to send back the data exposed by this
 method in previous sessions.
 
 @return the dictionary of parameters, may be nil
 */
-(NSDictionary*)getParameters;

/**
 Method to set required parameters input by user or other sources. There are some built-in keys which have predefined meanings. For example, the
 <code>kCertificateProviderParameterKeyURL</code> key should be set if the application has been opened with the <code>application:openURL:options:</code> and it should
 contain the value of the URL. This is useful for those implementations which communicate with external applications and expect a custom URL scheme-based callback
 from said applications.

 @param params key/value map of the paramters which should be used by the provider to get the certificate properly, provider-dependent, can be nil
 @param error anError out parameter to emit any errors that occur during setting the parameters, can be nil
 @return YES if the method set the parameters successfully, NO otherwise
 */
-(BOOL)setParameters:(NSDictionary*)params failedWithError:(NSError**)error;

@end


