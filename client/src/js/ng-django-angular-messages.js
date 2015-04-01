(function(angular, undefined) {
'use strict';

angular
    .module('ng.django.angular.messages',[
		'ng.django.forms',
        'ngMessages'
    ])

	
	.config(removeNgDjangoFormsValidateMultipleFields)
    .directive('form', formDirectiveFactory())
	.directive('ngForm', formDirectiveFactory(true))
	.directive('djngError', djngError)
	.directive('djngMsgsError', djngMsgsError)
    .directive('djngValidateRejected', validateRejected)
    .factory('djngAngularMessagesForm', djngAngularMessagesForm)

	.controller('ValidateMultipleFieldsCtrl', ValidateMultipleFieldsCtrl)
	.directive('validateMultipleFields', validateMultipleFields)
	.directive('ngModel', ngModel)
	

	



function removeNgDjangoFormsValidateMultipleFields($provide) {
	
	/*
	 * NOTE: this only gets run if the directive is actually
	 * currently being used in the DOM. Not just if it's registered
	 * with a module.
	 */
	$provide.decorator('validateMultipleFieldsDirective', function($delegate) {
		$delegate.shift();
		console.log($delegate);
		return $delegate;
	});
}


/**
 * An extension to form
 * 
 * Adds the following methods and functionality:
 * 
 * - setValidFieldsPristine()
 */

function formDirectiveFactory(isNgForm) {
	
	return function() {

		return {
			restrict: isNgForm ? 'EAC' : 'E',
			require: 'form',
			link: {
				pre: function(scope, element, attrs, formCtrl) {

		  		    var controls,
		  		    	modelName;

		  		    var _superAdd = formCtrl.$addControl;

		  		    formCtrl.$addControl = function(control) {

		  		    	_superAdd(control)

		  		    	controls = controls || [];

		  		    	if(controls.indexOf(control) === -1) {
		  		    		controls.push(control);
		  		    	}
		  		    }

			  		var _superRemove = formCtrl.$removeControl;

			  	    formCtrl.$removeControl = function(control) {

			  	    	_superRemove(control)

				    	if(controls && controls.indexOf(control) !== -1) {
		  		    		controls.splice(controls.indexOf(control), 1);
		  		    	}
		  		    }

		  		    formCtrl.setValidFieldsPristine = function() {

		    			var i = 0,
			    		  	len = controls.length,
			  				control;

			  			for(; i < len; i++) {
			  				control = controls[i];
			  				if(control.$valid) {
			  					control.$setPristine();
			  				}
			  			}
			  		}
			   	}
		 	}
		}
	}

}


function djngError($timeout) {
	
	return {
		restrict: 'A',
		require: '?^form',
		link: function(scope, element, attrs, formCtrl) {
			
			if (!formCtrl || angular.isUndefined(attrs.name) || attrs.djngError !== 'bound-msg-field')
				return;
			
			element.removeAttr('djng-error');
			
			$timeout(function(){
				formCtrl.$setSubmitted();
			});
		}
	}
}


function djngMsgsError($timeout) {
	
	return {
		restrict: 'A',
		require: [
			'?^form',
			'?ngModel'
		],
		link: function(scope, element, attrs, ctrls) {
		
			var formCtrl = ctrls[0],
				ngModel = ctrls[1];
			
			element.removeAttr('djng-msgs-error');
				
			if(!formCtrl || !ngModel)
				return;
			
			$timeout(function(){
				
				formCtrl.$setSubmitted();
				
			/*	var ctrl = ngModel;
				
				if(isSubField()) {
					
					ctrl.$message = {rejected: attrs.djngMsgsError};
					ctrl = formCtrl;
				}
				
				ctrl.$message = {rejected: attrs.djngMsgsError};
				
				ngModel.$validate();
				
				if(isSubField()) {
					console.log(formCtrl);
					console.log(ngModel);
				} */
			});
			
			function isSubField() {
				return (ngModel.$name.indexOf(formCtrl.$name) === 0);
			}
		}
	}
}


function validateRejected() {

	return {
		restrict: 'A',
		require: '?ngModel',
		link: function(scope, element, attrs, ngModel) {
			
			if(!ngModel) return;
			
			var _hasMessage = false,
				_value = null;

			ngModel.$validators.rejected = function(value) {
                
				if(_hasMessage && (_value !== value)) {
					
					_hasMessage = false;
					_value = null;
					
					if(ngModel.$message) {
						ngModel.$message.rejected = undefined;
					}
					
				}else{
					
					_hasMessage = !!(ngModel.$message && ngModel.$message.rejected !== undefined);
					
					if(_hasMessage) {
					    _value = value;	
					}
				}

				return !_hasMessage;
			}
		}
	}
}


function ValidateMultipleFieldsCtrl($attrs) {
	
	var vm = this,
		formCtrl,
		inputCtrls = [],
		subFields;
	
	vm.setFormCtrl = setFormCtrl;
	vm.setSubFields = setSubFields;
	vm.getSubFields = getSubFields;
	vm.addInputCtrl = addInputCtrl;
	vm.validate = validate;
		
	/* ----------------- */
	
	function setFormCtrl(value) {
		formCtrl = value;
	}
	
	function setSubFields(value) {
		subFields = value;
	}
	
	function getSubFields() {
		return subFields;
	}
	
	function addInputCtrl(ctrl) {
		
		if(_isNotValidSubField(ctrl.$name))
			return;
			
		if(_containsInputWithSameName(ctrl.$name))
			return;
		console.log(ctrl);	
		inputCtrls.push(ctrl);
		
		ctrl.$viewChangeListeners.push(function() {
			console.log(ctrl);
			validate(true);
		});
	}
	
	function _containsInputWithSameName(name) {
		var i = 0,
			len = inputCtrls.length;
			
		for(; i < len; i++) {
			if(inputCtrls[i].$name == name)
				return true;
		}
		
		return false;
	}
	
	function validate(trigger) {

		var valid = false;
		
		angular.forEach(inputCtrls, function(input) {
			
			valid = !!(valid || input.$modelValue);
			
			if(_hasClearRejectedMethod(input)) {
				input.clearRejected();
			}
			
			if(trigger && _hasValidateMethod(input)) {
				
				if(angular.isObject(input.$message)) {
					input.$message.rejected = undefined;
				}
					
				input.$validate();
			}
		});
		
		formCtrl.$setValidity('required', valid);
		
		if (trigger) {
			
			if(angular.isString(formCtrl.$message))
				formCtrl.$message = '';
				
			if(angular.isObject(formCtrl.$message))	
				formCtrl.$message.rejected = undefined;
			
			formCtrl.$dirty = true;
			formCtrl.$pristine = false;
		}
	}
	
	function _isNotValidSubField(name) {
		return !!subFields && subFields.indexOf(name) == -1;
	}
	
	function _hasClearRejectedMethod(obj) {
		return typeof obj.clearRejected === 'function';
	}
	
	function _hasValidateMethod(obj) {
		return typeof obj.$validate === 'function';
	}
}


function validateMultipleFields() {
	return {
		restrict: 'A',
		require: [
			'validateMultipleFields',
			'^?form'
		],
		controller: 'ValidateMultipleFieldsCtrl',
		link: {
			
			pre: function(scope, element, attrs, ctrls) {
			
				var ctrl = ctrls[0],
					formCtrl = ctrls[1],
					subFields;
				
				if(!formCtrl)
					return;
			
				try {
					subFields = angular.fromJson(attrs.validateMultipleFields);
				} catch (SyntaxError) {
					if (!angular.isString(attrs.validateMultipleFields))
						return;
					subFields = attrs.validateMultipleFields;
				}
			
				ctrl.setSubFields(subFields);
			},
		
			post: function(scope, element, attrs, ctrls) {
			
				var ctrl = ctrls[0],
					formCtrl = ctrls[1],
					subFields;
				
				if(!formCtrl)
					return;
					
				subFields = ctrl.getSubFields();
				
				if(angular.isString(subFields))
					formCtrl = formCtrl[subFields];
				
				ctrl.setFormCtrl(formCtrl);
				ctrl.validate();
			}
		}
	};
}


function ngModel() {
	return {
		restrict:'A',
		/*
		 * ensure that this gets fired after ng.django.forms ngModel directive,
		 * as if initial/bound value is set, $viewChangeListener is fired
		 */
		priority: 2,
		require: [
			'?^form',
			'?^validateMultipleFields',
			'?ngModel'
		],
		link: function(scope, element, attrs, ctrls) {
			
			var formCtrl = ctrls[0],
				vmfCtrl = ctrls[1],
				ngModel = ctrls[2];
				
			if(!formCtrl || !vmfCtrl || !ngModel)
				return;
				
			vmfCtrl.addInputCtrl(ngModel);
		}
	}
}


function djngAngularMessagesForm() {
	
	return {
		setErrors: setErrors
	}
	
	/* ============================ */
	
	function setErrors(form, errors) {
		_clearFormMessage(form);
		_displayErrors(form, errors);
		return _isNotEmpty(errors);
	};
	
	function _clearFormMessage(form) {
		form.$message = undefined;
	};
	
	function _displayErrors(form, errors) {
		
		_setSubmitted(form);
		
		angular.forEach(errors, function(error, key) {
			
			var field,
				message = error[0];

			if(form.hasOwnProperty(key)) {
				
				field = form[key];
				
				_addMessageToField(field, message);
				
				if (_isField(field)) {

					_validateField(field);
				
				/*
				 * field is a sub form - composite of input elements
				 */
				} else {
					
					_setSubmitted(field);
					
					/*
					 * We iterate the props of the form to find the fields.
					 *
					 * Each field then has the error message applied to it and
					 * its $validate method called.
					 *
					 * This triggers the fields validators to run, potentially
					 * (as another validator may error first - i.e 'required'
					 * if the current $modelValue is undefined) causing the
					 * 'rejected' validator added by the djng-validate-rejected
					 * directive to return false.
					 * 
					 * This in turn causes a 'rejected' error to be set on the
					 * sub-form, causing the 'rejected' error message to be displayed.
					 */
					angular.forEach(field, function(value, prop) {
						
						if(!!value && _isField(value)) {
							
							_addMessageToField(value, message);
							_validateField(value);
						}
					});
				}
		
			}else{
				
				form.$message = message;
				/*
				 * Only set current valid fields to pristine
				 *
				 * Any field that's been submitted with an error should
				 * still display its error
				 *
				 * Any field that was valid when the form was submitted,
				 * may have caused the NON_FIELD_ERRORS, so should be set
				 * to pristine to prevent it's valid state being displayed
				 */
				form.setValidFieldsPristine();
			}
		});
	}
	
	function _isField(field) {
		return angular.isFunction(field.$validate)
	}
	
	function _addMessageToField(field, message) {
		field.$message = field.$message || {};
		field.$message.rejected = message;
	}
	
	function _validateField(field) {
		field.$validate(field);
	}
	
	function _setSubmitted(form) {
		form.$setSubmitted();
	}
	
	function _isNotEmpty(obj) {
		for (var p in obj) { 
			if (obj.hasOwnProperty(p))
				return true;
		}
		return false;
	}
};



})(window.angular);
