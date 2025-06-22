Feature: eat godogs subpackage
  In order to be happy
  As a hungry gopher
  I need to be able to eat godogs

  Scenario: Eat 5 out of 12 subpackage
    Given there are 12 godogs
    When I eat 5
    Then there should be 7 remaining

  Scenario: Eat 0 out of 12 subpackage
    Given there are 12 godogs
    When I eat 0
    Then there should be 12 remaining